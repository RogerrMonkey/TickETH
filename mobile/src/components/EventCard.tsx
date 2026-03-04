import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Badge } from './ui/Badge';
import { formatDate, hasEventStarted, isEventSoon, formatPrice } from '../utils/format';
import type { TickETHEvent } from '../types';

interface EventCardProps {
  event: TickETHEvent;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const started = hasEventStarted(event.start_time);
  const soon = isEventSoon(event.start_time);
  const lowestPrice = event.tiers?.reduce<string | null>((lowest, tier) => {
    if (!lowest) return tier.price;
    return BigInt(tier.price) < BigInt(lowest) ? tier.price : lowest;
  }, null);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.container}>
      {/* Banner */}
      <View style={styles.bannerWrapper}>
        {event.banner_url ? (
          <Image
            source={{ uri: event.banner_url }}
            style={styles.banner}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.banner, styles.bannerPlaceholder]}>
            <Ionicons name="calendar" size={32} color={Colors.textMuted} />
          </View>
        )}

        {/* Status badge overlay */}
        <View style={styles.badgeOverlay}>
          {started ? (
            <Badge label="Live Now" variant="error" size="md" />
          ) : soon ? (
            <Badge label="Starting Soon" variant="warning" size="md" />
          ) : (
            <Badge label="Upcoming" variant="success" />
          )}
        </View>

        {/* Price tag overlay */}
        {lowestPrice && (
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>From {formatPrice(lowestPrice)}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
            <Text style={styles.metaText}>{formatDate(event.start_time)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={Colors.primary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.venue}
            </Text>
          </View>
        </View>

        {/* Ticket progress */}
        {event.tickets_sold !== undefined && event.total_tickets !== undefined && (
          <View style={styles.ticketInfo}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      (event.tickets_sold / Math.max(event.total_tickets, 1)) * 100,
                      100,
                    )}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.ticketMeta}>
              <Text style={styles.ticketCount}>
                {event.tickets_sold}/{event.total_tickets} sold
              </Text>
              {event.total_tickets - event.tickets_sold <= 10 &&
                event.total_tickets - event.tickets_sold > 0 && (
                  <Text style={styles.ticketWarning}>
                    Only {event.total_tickets - event.tickets_sold} left!
                  </Text>
                )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
    marginBottom: Spacing.lg,
  },
  bannerWrapper: {
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: 160,
  },
  bannerPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  meta: {
    gap: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  ticketInfo: {
    marginTop: Spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketCount: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  ticketWarning: {
    color: Colors.warning,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  priceTag: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  priceText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
});
