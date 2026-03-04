import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** ERC-721 compliant metadata */
export interface NftMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
}

export interface IpfsUploadResult {
  cid: string;
  gatewayUrl: string;
  ipfsUri: string; // ipfs://Qm...
}

@Injectable()
export class IpfsService implements OnModuleInit {
  private readonly logger = new Logger(IpfsService.name);
  private apiKey!: string;
  private apiSecret!: string;
  private jwt!: string;
  private gateway!: string;
  private readonly PINATA_API = 'https://api.pinata.cloud';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.jwt = this.config.get<string>('PINATA_JWT', '');
    this.apiKey = this.config.get<string>('PINATA_API_KEY', '');
    this.apiSecret = this.config.get<string>('PINATA_API_SECRET', '');
    this.gateway = this.config.get<string>(
      'PINATA_GATEWAY',
      'https://gateway.pinata.cloud/ipfs',
    );

    if (!this.jwt && !this.apiKey) {
      this.logger.warn(
        'No PINATA_JWT or PINATA_API_KEY set — IPFS uploads disabled',
      );
    } else {
      this.logger.log('IPFS service initialized (Pinata)');
    }
  }

  /* ── Headers ──────────────────────────────────────────────── */

  private authHeaders(): Record<string, string> {
    if (this.jwt) {
      return { Authorization: `Bearer ${this.jwt}` };
    }
    return {
      pinata_api_key: this.apiKey,
      pinata_secret_api_key: this.apiSecret,
    };
  }

  /* ── Public API ───────────────────────────────────────────── */

  /** Pin arbitrary JSON to IPFS (general use) */
  async pinJson(
    json: Record<string, any>,
    name?: string,
  ): Promise<IpfsUploadResult> {
    this.ensureConfigured();

    const body = {
      pinataContent: json,
      pinataMetadata: { name: name ?? 'ticketh-json' },
      pinataOptions: { cidVersion: 1 },
    };

    const res = await fetch(`${this.PINATA_API}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pinata pinJSON failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { IpfsHash: string };
    return this.buildResult(data.IpfsHash);
  }

  /** Pin a file (Buffer) to IPFS */
  async pinFile(
    buffer: Buffer,
    fileName: string,
    mimeType = 'application/octet-stream',
  ): Promise<IpfsUploadResult> {
    this.ensureConfigured();

    // Build multipart form using native FormData (Node 18+)
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append(
      'pinataMetadata',
      JSON.stringify({ name: fileName }),
    );
    formData.append(
      'pinataOptions',
      JSON.stringify({ cidVersion: 1 }),
    );

    const res = await fetch(`${this.PINATA_API}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: { ...this.authHeaders() },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pinata pinFile failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { IpfsHash: string };
    return this.buildResult(data.IpfsHash);
  }

  /** Generate & pin ERC-721 compliant NFT metadata for a ticket */
  async pinTicketMetadata(params: {
    eventName: string;
    tierName: string;
    tokenId: number;
    description?: string;
    imageUri?: string;       // already-pinned image IPFS URI or HTTP URL
    externalUrl?: string;    // e.g. https://ticketh.xyz/ticket/123
    eventDate?: string;      // ISO 8601
    venue?: string;
    city?: string;
    ticketPrice?: string;    // human-readable, e.g. "0.05 MATIC"
    tierIndex?: number;
    maxSupply?: number;
    organizerAddress?: string;
    contractAddress?: string;
  }): Promise<IpfsUploadResult> {
    const attributes: NftMetadata['attributes'] = [
      { trait_type: 'Event', value: params.eventName },
      { trait_type: 'Tier', value: params.tierName },
      { trait_type: 'Token ID', value: params.tokenId, display_type: 'number' },
    ];

    if (params.eventDate) {
      attributes.push({ trait_type: 'Event Date', value: params.eventDate });
    }
    if (params.venue) {
      attributes.push({ trait_type: 'Venue', value: params.venue });
    }
    if (params.city) {
      attributes.push({ trait_type: 'City', value: params.city });
    }
    if (params.ticketPrice) {
      attributes.push({ trait_type: 'Price', value: params.ticketPrice });
    }
    if (params.tierIndex !== undefined) {
      attributes.push({
        trait_type: 'Tier Index',
        value: params.tierIndex,
        display_type: 'number',
      });
    }
    if (params.maxSupply) {
      attributes.push({
        trait_type: 'Max Supply',
        value: params.maxSupply,
        display_type: 'number',
      });
    }

    const metadata: NftMetadata = {
      name: `${params.eventName} — ${params.tierName} #${params.tokenId}`,
      description:
        params.description ??
        `NFT ticket for ${params.eventName}. Tier: ${params.tierName}. Powered by TickETH.`,
      image: params.imageUri ?? '',
      external_url: params.externalUrl,
      attributes,
    };

    const metadataName = `ticketh-${params.contractAddress ?? 'ticket'}-${params.tokenId}`;
    return this.pinJson(metadata, metadataName);
  }

  /** Unpin a CID from Pinata (cleanup) */
  async unpin(cid: string): Promise<void> {
    this.ensureConfigured();

    const res = await fetch(`${this.PINATA_API}/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: { ...this.authHeaders() },
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Pinata unpin failed (${res.status}): ${text}`);
    }
  }

  /** Test Pinata connection */
  async testConnection(): Promise<boolean> {
    try {
      this.ensureConfigured();
      const res = await fetch(
        `${this.PINATA_API}/data/testAuthentication`,
        { headers: { ...this.authHeaders() } },
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  /* ── Helpers ──────────────────────────────────────────────── */

  private buildResult(cid: string): IpfsUploadResult {
    return {
      cid,
      gatewayUrl: `${this.gateway}/${cid}`,
      ipfsUri: `ipfs://${cid}`,
    };
  }

  private ensureConfigured() {
    if (!this.jwt && !this.apiKey) {
      throw new Error(
        'IPFS not configured. Set PINATA_JWT or PINATA_API_KEY + PINATA_API_SECRET in .env',
      );
    }
  }
}
