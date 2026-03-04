import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteSaleDto {
  @ApiProperty({ description: 'Listing ID (UUID)' })
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @ApiProperty({ description: 'Buyer wallet address' })
  @IsString()
  @IsNotEmpty()
  buyerWallet: string;

  @ApiProperty({ description: 'Sale transaction hash' })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiPropertyOptional({ description: 'Platform fee in wei' })
  @IsString()
  @IsOptional()
  platformFeeWei?: string;

  @ApiPropertyOptional({ description: 'Seller proceeds in wei' })
  @IsString()
  @IsOptional()
  sellerProceedsWei?: string;
}
