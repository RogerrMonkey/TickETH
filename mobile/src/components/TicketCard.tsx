import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Badge } from './ui/Badge';
import { formatDate, formatPrice, formatTicketStatus } from '../utils/format';
import type { Ticket, TicketStatus } from '../types';

interface TicketCardProps {
  ticket: Ticket;
  onPress: () => void;
}

const statusVariant: Record<TicketStatus, 'success' | 'default' | 'warning' | 'info' | 'error'> = {
  minted: 'success',
  checked_in: 'default',
  transferred: 'warning',
  listed: 'info',
  invalidated: 'error',
};

export function TicketCard({ ticket, onPress }: TicketCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.container}>
      {/* Left accent bar */}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: ticket.status === 'minted' ? Colors.primary : Colors.textMuted },
        ]}
      />

      <View style={styles.content}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.titleArea}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {ticket.event?.title ?? 'Event'}
            </Text>
            <Text style={styles.tierName} numberOfLines={1}>
              {ticket.tier?.name ?? 'General'}
            </Text>
          </View>
          <Badge
            label={formatTicketStatus(ticket.status)}
            variant={statusVariant[ticket.status]}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerCircleLeft} />
          <View style={styles.dividerLine} />
          <View style={styles.dividerCircleRight} />
        </View>

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          <View style={styles.detail}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.detailText}>#{ticket.token_id}</Text>
          </View>

          {ticket.event?.start_time && (
            <View style={styles.detail}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.detailText}>{formatDate(ticket.event.start_time)}</Text>
            </View>
          )}

          {ticket.tier?.price && (
            <View style={styles.detail}>
              <Ionicons name="diamond-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.detailText}>{formatPrice(ticket.tier.price)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow */}
      <View style={styles.arrow}>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
    marginBottom: Spacing.md,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleArea: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  eventTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  tierName: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerCircleLeft: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.background,
    marginLeft: -Spacing.lg - 4, // Extend to edge
  },
  dividerLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  dividerCircleRight: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.background,
    marginRight: -Spacing.lg,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
  arrow: {
    justifyContent: 'center',
    paddingRight: Spacing.md,
  },
});
