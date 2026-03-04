import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordMintDto {
  @ApiPropertyOptional({ description: 'On-chain token ID (resolved from chain if not provided)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tokenId?: number;

  @ApiProperty({ description: 'Event contract address' })
  @IsString()
  @IsNotEmpty()
  contractAddress!: string;

  @ApiProperty({ description: 'Event UUID' })
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ description: 'Tier UUID' })
  @IsString()
  @IsNotEmpty()
  tierId!: string;

  @ApiProperty({ description: 'Wallet that minted' })
  @IsString()
  @IsNotEmpty()
  ownerWallet!: string;

  @ApiPropertyOptional({ description: 'Mint transaction hash' })
  @IsOptional()
  @IsString()
  txHash?: string;

  @ApiPropertyOptional({ description: 'IPFS metadata URI' })
  @IsOptional()
  @IsString()
  metadataUri?: string;
}
