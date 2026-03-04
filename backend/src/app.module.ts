import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizerRequestsModule } from './organizer-requests/organizer-requests.module';
import { EventsModule } from './events/events.module';
import { TicketTiersModule } from './ticket-tiers/ticket-tiers.module';
import { TicketsModule } from './tickets/tickets.module';
import { CheckinModule } from './checkin/checkin.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { QueuesModule } from './queues/queues.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({ isGlobal: true }),

    // BullMQ — Redis queue
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),

    // Core modules
    SupabaseModule,
    AuthModule,
    UsersModule,
    OrganizerRequestsModule,
    EventsModule,
    TicketTiersModule,
    TicketsModule,
    CheckinModule,
    AuditModule,
    AdminModule,
    BlockchainModule,
    MarketplaceModule,

    // Phase 3 additions
    IpfsModule,
    QueuesModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
