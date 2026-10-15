import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as endpoints from '@/api/endpoints';

/**
 * Expo push-notification plumbing for the seller app.
 *
 * - Asks for permission (ideally right after login).
 * - Retrieves the Expo push token and registers it with the backend so the
 *   dispatch service can reach this device.
 * - Configures how notifications present while the app is foregrounded, and a
 *   background handler so a push still shows if the app is closed.
 * - Deep-links a "new order" notification to /orders/[id].
 *
 * NOTE: Expo push tokens only mint once a real EAS `projectId` exists
 * (app.json -> extra.eas.projectId, set by `eas init`). Until then
 * getExpoPushTokenAsync throws; we surface that gracefully and the rest of the
 * app keeps working.
 */

// Present alerts while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const ask = await Notifications.requestPermissionsAsync();
    granted = ask.granted;
  }
  // Android requires a channel for heads-up notifications.
  if (granted && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066FF',
    });
  }
  return granted;
}

/**
 * Get this device's Expo push token, or null if push isn't available (simulator,
 * denied permission, or the project isn't initialized with a real projectId).
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const projectId = getProjectId();
    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (err) {
    console.warn('[push] unable to get Expo push token:', err);
    return null;
  }
}

function getProjectId(): string | undefined {
  // expo-constants reads app.json -> extra.eas.projectId (and, in an EAS
  // update, the dynamically-provided value).
  try {
    // Lazy require to avoid a hard dep cycle at module load.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants');
    return Constants?.default?.easConfig?.projectId ?? Constants?.expoConfig?.extra?.eas?.projectId;
  } catch {
    return undefined;
  }
}

/** Register the current device with the backend (idempotent upsert). */
export async function registerDeviceForPush(): Promise<void> {
  const granted = await requestPushPermission();
  if (!granted) return;
  const token = await getExpoPushToken();
  if (!token) return;
  try {
    await endpoints.registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android');
  } catch (err) {
    console.warn('[push] device register failed:', err);
  }
}

/** Unregister this device on logout. */
export async function unregisterDeviceForPush(): Promise<void> {
  const token = await getExpoPushToken().catch(() => null);
  if (!token) return;
  await endpoints.unregisterDevice(token).catch(() => undefined);
}

/** Configure a deep-link router for notification taps (e.g. new order). */
export function addNotificationResponseListener(handler: (data: Record<string, unknown>) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response?.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
    handler(data);
  });
}

/**
 * Decide which route a notification payload should open. Matches the payload
 * `type` values the backend sends in services/pushService.js callers:
 *   order_created, order_status (orderRoutes/mobileRoutes)
 *   order_paid (paymentWebhooks)
 *   subscription_active (paymentWebhooks)
 */
export function routeForNotification(data: Record<string, unknown>): string | null {
  const type = data?.type;
  if (type === 'order_created' || type === 'order_status' || type === 'order_paid' || type === 'payment_received') {
    const id = data?.orderId ?? data?.order_id;
    return id ? `/orders/${id}` : '/orders';
  }
  if (type === 'subscription_active') return '/settings';
  return null;
}
