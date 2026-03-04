import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EventsService } from '../events/events.service';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';

@Injectable()
export class TicketTiersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly events: EventsService,
  ) {}

  /** Create a tier for an event */
  async create(eventId: string, organizerId: string, dto: CreateTierDto) {
    const event = await this.events.findById(eventId);
    if (event.organizer_id !== organizerId) {
      throw new ForbiddenException('You do not own this event');
    }

    const { data, error } = await this.supabase.admin
      .from('ticket_tiers')
      .insert({
        event_id: eventId,
        tier_index: dto.tierIndex,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        price_wei: dto.priceWei,
        currency: dto.currency ?? 'MATIC',
        max_supply: dto.maxSupply,
        resale_allowed: dto.resaleAllowed ?? true,
        start_time: dto.startTime,
        end_time: dto.endTime,
        max_per_wallet: dto.maxPerWallet ?? 0,
        merkle_root: dto.merkleRoot,
        max_resales: dto.maxResales ?? 0,
        max_price_deviation_bps: dto.maxPriceDeviationBps ?? 0,
        active: dto.active ?? true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /** Batch-create tiers for an event */
  async createBatch(eventId: string, organizerId: string, tiers: CreateTierDto[]) {
    const event = await this.events.findById(eventId);
    if (event.organizer_id !== organizerId) {
      throw new ForbiddenException('You do not own this event');
    }

    const rows = tiers.map((dto) => ({
      event_id: eventId,
      tier_index: dto.tierIndex,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      price_wei: dto.priceWei,
      currency: dto.currency ?? 'MATIC',
      max_supply: dto.maxSupply,
      resale_allowed: dto.resaleAllowed ?? true,
      start_time: dto.startTime,
      end_time: dto.endTime,
      max_per_wallet: dto.maxPerWallet ?? 0,
      merkle_root: dto.merkleRoot,
      max_resales: dto.maxResales ?? 0,
      max_price_deviation_bps: dto.maxPriceDeviationBps ?? 0,
      active: dto.active ?? true,
    }));

    const { data, error } = await this.supabase.admin
      .from('ticket_tiers')
      .insert(rows)
      .select('*');

    if (error) throw error;
    return data;
  }

  /** Get all tiers for an event */
  async findByEvent(eventId: string) {
    const { data, error } = await this.supabase.admin
      .from('ticket_tiers')
      .select('*')
      .eq('event_id', eventId)
      .order('tier_index', { ascending: true });

    if (error) throw error;
    return data;
  }

  /** Get tier availability view */
  async getAvailability(eventId: string) {
    const { data, error } = await this.supabase.admin
      .from('tier_availability')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data;
  }

  /** Update a tier */
  async update(tierId: string, organizerId: string, dto: UpdateTierDto) {
    // Verify ownership via event
    const { data: tier } = await this.supabase.admin
      .from('ticket_tiers')
      .select('*, events!inner(organizer_id)')
      .eq('id', tierId)
      .single();

    if (!tier) throw new NotFoundException('Tier not found');
    if ((tier as any).events.organizer_id !== organizerId) {
      throw new ForbiddenException('You do not own this event');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.priceWei !== undefined) updateData.price_wei = dto.priceWei;
    if (dto.maxSupply !== undefined) updateData.max_supply = dto.maxSupply;
    if (dto.resaleAllowed !== undefined) updateData.resale_allowed = dto.resaleAllowed;
    if (dto.startTime !== undefined) updateData.start_time = dto.startTime;
    if (dto.endTime !== undefined) updateData.end_time = dto.endTime;
    if (dto.maxPerWallet !== undefined) updateData.max_per_wallet = dto.maxPerWallet;
    if (dto.merkleRoot !== undefined) updateData.merkle_root = dto.merkleRoot;
    if (dto.maxResales !== undefined) updateData.max_resales = dto.maxResales;
    if (dto.maxPriceDeviationBps !== undefined) updateData.max_price_deviation_bps = dto.maxPriceDeviationBps;
    if (dto.active !== undefined) updateData.active = dto.active;

    const { data, error } = await this.supabase.admin
      .from('ticket_tiers')
      .update(updateData)
      .eq('id', tierId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /** Increment minted count (called after on-chain mint) */
  async incrementMinted(tierId: string, count = 1) {
    // Use RPC function or manual increment
    const { data: tier } = await this.supabase.admin
      .from('ticket_tiers')
      .select('minted')
      .eq('id', tierId)
      .single();

    if (!tier) throw new NotFoundException('Tier not found');

    const { data, error } = await this.supabase.admin
      .from('ticket_tiers')
      .update({ minted: tier.minted + count })
      .eq('id', tierId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}
