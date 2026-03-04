import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { TicketCard } from '../../src/components/TicketCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useMyTickets } from '../../src/hooks/useTickets';
import { TicketCardSkeleton } from '../../src/components/Skeleton';
import { analytics } from '../../src/services/analytics';
import type { TicketStatus, Ticket } from '../../src/types';

type Filter = 'all' | TicketStatus;

const FILTERS: { key: Filter; label: string; icon?: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All' },
  { key: 'minted', label: 'Active', icon: 'ticket-outline' },
  { key: 'checked_in', label: 'Used', icon: 'checkmark-circle-outline' },
  { key: 'listed', label: 'Listed', icon: 'pricetag-outline' },
  { key: 'transferred', label: 'Sent', icon: 'swap-horizontal-outline' },
];

export default function TicketsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const { tickets, loading, error, refresh } = useMyTickets();

  const filtered = useMemo(
    () => (filter === 'all' ? tickets : tickets.filter((t) => t.status === filter)),
    [tickets, filter],
  );

  // Stats
  const activeCount = useMemo(() => tickets.filter((t) => t.status === 'minted').length, [tickets]);
  const checkedInCount = useMemo(
    () => tickets.filter((t) => t.status === 'checked_in').length,
    [tickets],
  );

  useEffect(() => {
    analytics.screenView('my_tickets');
  }, []);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    refresh();
  }, [refresh]);

  const handleFilterChange = useCallback((key: Filter) => {
    Haptics.selectionAsync().catch(() => {});
    setFilter(key);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Ticket; index: number }) => (
      <AnimatedTicketCard
        ticket={item}
        index={index}
        onPress={() => {
          analytics.track('ticket_viewed', { ticketId: item.id, status: item.status });
          router.push(`/ticket/${item.id}`);
        }}
      />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>Your Collection</Text>
        <Text style={styles.title} accessibilityRole="header">
          My Tickets
        </Text>
        {tickets.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="ticket" size={14} color={Colors.primary} />
              <Text style={styles.statText}>{activeCount} active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.statText}>{checkedInCount} used</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statText}>{tickets.length} total</Text>
            </View>
          </View>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map(({ key, label, icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => handleFilterChange(key)}
            style={[styles.filterPill, filter === key && styles.filterPillActive]}
            accessibilityRole="button"
            accessibilityLabel={`Filter: ${label}`}
            accessibilityState={{ selected: filter === key }}
          >
            {icon && (
              <Ionicons
                name={icon}
                size={14}
                color={filter === key ? Colors.textPrimary : Colors.textMuted}
              />
            )}
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Ticket list */}
      {loading && tickets.length === 0 ? (
        <View style={styles.list}>
          {[1, 2, 3].map((i) => (
            <TicketCardSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Failed to load"
          message={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading && tickets.length > 0}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="ticket-outline"
              title={filter === 'all' ? 'No tickets yet' : `No ${filter} tickets`}
              message="Browse events to get your first NFT ticket"
              actionLabel="Browse Events"
              onAction={() => router.push('/(tabs)/events')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

/** Animated wrapper for staggered fade-in */
function AnimatedTicketCard({
  ticket,
  index,
  onPress,
}: {
  ticket: Ticket;
  index: number;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = Math.min(index * 70, 350);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Expiration indicator — check if event has passed
  const isExpired =
    ticket.event?.start_time && new Date(ticket.event.start_time) < new Date();
  const isTransferred = ticket.status === 'transferred';

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {(isExpired || isTransferred) && (
        <View style={styles.ticketBadgeRow}>
          {isTransferred && (
            <View style={styles.ticketBadge}>
              <Ionicons name="swap-horizontal" size={10} color={Colors.warning} />
              <Text style={styles.ticketBadgeText}>Transferred</Text>
            </View>
          )}
          {isExpired && !isTransferred && (
            <View style={[styles.ticketBadge, { backgroundColor: 'rgba(107,107,128,0.15)' }]}>
              <Ionicons name="time-outline" size={10} color={Colors.textMuted} />
              <Text style={[styles.ticketBadgeText, { color: Colors.textMuted }]}>
                Event Passed
              </Text>
            </View>
          )}
        </View>
      )}
      <TicketCard ticket={ticket} onPress={onPress} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  filterTextActive: {
    color: Colors.textPrimary,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['6xl'],
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: 4,
    paddingLeft: Spacing.sm,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ticketBadgeText: {
    color: Colors.warning,
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
  },
});
