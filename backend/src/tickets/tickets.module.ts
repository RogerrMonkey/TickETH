import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { MintProcessor } from './mint.processor';
import { TicketTiersModule } from '../ticket-tiers/ticket-tiers.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'mint-reconciliation' }),
    TicketTiersModule,
    AuditModule,
  ],
  providers: [TicketsService, MintProcessor],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}
