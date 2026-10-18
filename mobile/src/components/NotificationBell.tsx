import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import * as endpoints from '@/api/endpoints';

/**
 * Dashboard header bell — sits between the theme toggle and the settings gear
 * (header order: ThemeToggle → Notification → Settings). The unread badge is
 * fed by /notifications/unread-count (polls every minute; the Notifications
 * screen invalidates it when items are read).
 */
export function NotificationBell({ onPress, iconColor }: { onPress: () => void; iconColor: string }) {
  const { data } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: endpoints.getUnreadNotificationCount,
    refetchInterval: 60_000,
  });
  const unread = Number(data?.unread) || 0;

  return (
    <View style={styles.wrap}>
      <IconButton
        icon={unread > 0 ? 'bell' : 'bell-outline'}
        size={22}
        iconColor={iconColor}
        accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onPress={onPress}
      />
      {unread > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#D92D20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', lineHeight: 12 },
});
