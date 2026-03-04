import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyDto {
  @ApiProperty({ description: 'SIWE message string' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ description: 'Wallet signature of the SIWE message' })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}
