import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ description: 'Ticket ID (UUID from DB)' })
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @ApiProperty({ description: 'Event ID (UUID)' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ description: 'Tier ID (UUID)' })
  @IsString()
  @IsNotEmpty()
  tierId: string;

  @ApiProperty({ description: 'Contract address of the ticket NFT' })
  @IsString()
  @IsNotEmpty()
  contractAddress: string;

  @ApiProperty({ description: 'On-chain token ID' })
  @IsNumber()
  tokenId: number;

  @ApiProperty({ description: 'Asking price in MATIC (human readable)' })
  @IsNumber()
  @Min(0)
  askingPrice: number;

  @ApiProperty({ description: 'Asking price in wei (exact string)' })
  @IsString()
  @IsNotEmpty()
  askingPriceWei: string;

  @ApiProperty({ description: 'Original mint price in MATIC' })
  @IsNumber()
  @Min(0)
  originalPrice: number;

  @ApiProperty({ description: 'Original mint price in wei (exact string)' })
  @IsString()
  @IsNotEmpty()
  originalPriceWei: string;

  @ApiProperty({ description: 'Seller wallet address' })
  @IsString()
  @IsNotEmpty()
  sellerWallet: string;

  @ApiPropertyOptional({ description: 'Listing transaction hash (escrow transfer)' })
  @IsString()
  @IsOptional()
  listingTxHash?: string;
}
