import {
  Injectable,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SiweMessage, generateNonce } from 'siwe';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../common/interfaces';

@Injectable()
export class AuthService implements OnModuleInit {
  private static readonly NONCE_TTL_SECS = 300; // 5 minutes
  private readonly logger = new Logger(AuthService.name);
  private redis: Redis | null = null;
  // Fallback in-memory store (only when Redis unavailable)
  private readonly noncesFallback = new Map<string, { nonce: string; expiresAt: number }>();

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    try {
      this.redis = new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get<string>('REDIS_PASSWORD') || undefined,
        keyPrefix: 'ticketh:auth:nonce:',
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      this.redis.connect().then(() => {
        this.logger.log('Auth nonce Redis connected');
      }).catch((err) => {
        this.logger.warn(`Auth Redis failed — using in-memory fallback: ${err.message}`);
        this.redis = null;
      });
    } catch {
      this.logger.warn('Auth Redis unavailable — using in-memory fallback');
      this.redis = null;
    }
  }

  /** Generate a nonce for SIWE. Keyed by wallet address. */
  async getNonce(walletAddress: string): Promise<{ nonce: string }> {
    const nonce = generateNonce();
    const address = walletAddress.toLowerCase();

    if (this.redis) {
      await this.redis.set(address, nonce, 'EX', AuthService.NONCE_TTL_SECS);
    } else {
      this.noncesFallback.set(address, {
        nonce,
        expiresAt: Date.now() + AuthService.NONCE_TTL_SECS * 1000,
      });
    }

    return { nonce };
  }

  /** Verify SIWE message + signature → return JWT */
  async verify(message: string, signature: string): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch {
      throw new UnauthorizedException('Invalid SIWE message format');
    }

    const address = siweMessage.address.toLowerCase();

    // Validate nonce from Redis (or fallback)
    let storedNonce: string | null = null;
    if (this.redis) {
      storedNonce = await this.redis.get(address);
    } else {
      const entry = this.noncesFallback.get(address);
      if (entry && Date.now() <= entry.expiresAt) {
        storedNonce = entry.nonce;
      }
      this.noncesFallback.delete(address);
    }

    if (!storedNonce) {
      throw new UnauthorizedException('Nonce not found or expired — call /auth/nonce first');
    }
    if (storedNonce !== siweMessage.nonce) {
      throw new UnauthorizedException('Nonce mismatch');
    }

    // Verify signature
    try {
      await siweMessage.verify({ signature });
    } catch {
      throw new UnauthorizedException('Invalid signature');
    }

    // Consume nonce (single-use)
    if (this.redis) {
      await this.redis.del(address);
    }

    // Upsert user
    let user = await this.users.findByWallet(address);
    if (!user) {
      user = await this.users.create(address);
      this.logger.log(`New user created: ${address}`);
    }

    // Issue JWT
    const payload: JwtPayload = {
      sub: user.id,
      wallet_address: address,
      user_role: user.role,
      role: 'authenticated',
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, { expiresIn: '30d' });

    return { accessToken, refreshToken, user };
  }

  /** Refresh token — issue a new JWT pair from an existing valid one */
  async refresh(currentUser: JwtPayload): Promise<{ accessToken: string; refreshToken: string }> {
    // Fetch fresh user data (role may have changed)
    const user = await this.users.findById(currentUser.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload: JwtPayload = {
      sub: user.id,
      wallet_address: user.wallet_address,
      user_role: user.role,
      role: 'authenticated',
    };

    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, { expiresIn: '30d' }),
    };
  }

  /** Get full user profile for /auth/me */
  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
