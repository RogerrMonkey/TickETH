import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Layout } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useOfflineStore } from '../../src/stores/offlineStore';
import { View, Text, StyleSheet } from 'react-native';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';

export default function TabLayout() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const pendingCount = useOfflineStore((s) => s.pendingScans.length);

  // ─── Auth guard: wait for hydration, then redirect if not signed in ───
  if (!hydrated) {
    return <LoadingSpinner fullScreen message="Loading TickETH..." />;
  }
  if (!user) {
    return <Redirect href="/auth" />;
  }

  // Show scanner tab only for volunteers, admins, and organizers
  const isVolunteerRole = ['volunteer', 'admin', 'organizer'].includes(user.role);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Layout.tabBarHeight,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.medium,
        },
      }}
    >
      {/* Events tab — always visible */}
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />

      {/* Tickets tab — always visible for attendees */}
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'My Tickets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket" size={size} color={color} />
          ),
        }}
      />

      {/* Scanner tab — only for volunteers/admin/organizer */}
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="scan" size={size} color={color} />
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
          ),
          href: isVolunteerRole ? '/(tabs)/scanner' : null,
        }}
      />

      {/* Profile tab — always visible */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
});
