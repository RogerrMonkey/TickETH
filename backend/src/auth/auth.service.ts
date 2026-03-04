import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SiweMessage, generateNonce } from 'siwe';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../common/interfaces';
import { UserRole } from '../common/enums';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // In production, use Redis for nonce storage with TTL
  private readonly nonces = new Map<string, { nonce: string; expiresAt: number }>();

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  /** Generate a nonce for SIWE. Keyed by wallet address. */
  getNonce(walletAddress: string): { nonce: string } {
    const nonce = generateNonce();
    const address = walletAddress.toLowerCase();
    this.nonces.set(address, {
      nonce,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
    });
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

    // Validate nonce
    const stored = this.nonces.get(address);
    if (!stored) {
      throw new UnauthorizedException('Nonce not found — call /auth/nonce first');
    }
    if (Date.now() > stored.expiresAt) {
      this.nonces.delete(address);
      throw new UnauthorizedException('Nonce expired');
    }
    if (stored.nonce !== siweMessage.nonce) {
      throw new UnauthorizedException('Nonce mismatch');
    }

    // Verify signature
    try {
      await siweMessage.verify({ signature });
    } catch {
      throw new UnauthorizedException('Invalid signature');
    }

    // Consume nonce (single-use)
    this.nonces.delete(address);

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
