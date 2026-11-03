import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { queryClient } from '@/queryClient';

interface OfflineConnectionOverlayProps {
  enabled: boolean;
}

export function OfflineConnectionOverlay({ enabled }: OfflineConnectionOverlayProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const wasOffline = useRef(false);

  const isUsableConnection = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) =>
    Boolean(state.isConnected) && state.isInternetReachable !== false;

  const refreshActiveData = async () => {
    await queryClient.refetchQueries({ type: 'active' });
  };

  useEffect(() => {
    if (!enabled) {
      setOffline(false);
      wasOffline.current = false;
      return undefined;
    }

    let active = true;
    NetInfo.fetch().then((state) => {
      if (active) {
        const lost = !isUsableConnection(state);
        setOffline(lost);
        wasOffline.current = lost;
      }
    }).catch(() => undefined);

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!active) return;
      const lost = !isUsableConnection(state);
      if (wasOffline.current && !lost) {
        setOffline(false);
        setChecking(false);
        void refreshActiveData();
      } else {
        setOffline(lost);
      }
      wasOffline.current = lost;
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled]);

  useEffect(() => {
    if (!offline) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [offline, pulse]);

  const retry = async () => {
    setChecking(true);
    const state = await NetInfo.fetch().catch(() => null);
    if (state && isUsableConnection(state)) {
      setOffline(false);
      wasOffline.current = false;
      await refreshActiveData();
    } else {
      setChecking(false);
    }
  };

  if (!enabled || !offline) return null;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer, transform: [{ scale }] }]}>
          <MaterialCommunityIcons name="wifi-off" size={46} color={colors.onPrimaryContainer} />
        </Animated.View>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.onBackground }]}>You're offline</Text>
        <Text variant="bodyMedium" style={[styles.message, { color: colors.onSurfaceVariant }]}>
          Check your internet connection. Your screen and any saved POS work will stay in place.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry internet connection"
          disabled={checking}
          onPress={() => void retry()}
          style={({ pressed }) => [
            styles.retry,
            {
              backgroundColor: colors.primary,
              opacity: checking ? 0.72 : pressed ? 0.84 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={colors.onPrimary} />
          <Text style={[styles.retryText, { color: colors.onPrimary }]}>
            {checking ? 'Checking connection...' : 'Try again'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  content: { width: '100%', maxWidth: 380, alignItems: 'center' },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  message: { textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  retry: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryText: { fontWeight: '800', fontSize: 16 },
});
