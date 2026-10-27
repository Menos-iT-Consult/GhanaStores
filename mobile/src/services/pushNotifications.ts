import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as endpoints from '@/api/endpoints';

let registrationInFlight: Promise<PushRegistrationResult> | null = null;

/**
 * Expo push-notification plumbing for the seller app.
 *
 * - Registers only after permission is granted; the explicit prompt lives in Settings.
 * - Retrieves the Expo push token and registers it with the backend so the
 *   dispatch service can reach this device.
 * - Configures foreground presentation and routes notification taps, including
 *   the response that launched a cold app.
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

export async function getPushPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unavailable'> {
  if (!Device.isDevice) return 'unavailable';
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return 'granted';
  return existing.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPushPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (granted) await ensureNotificationChannel();
  return granted;
}

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Orders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0066FF',
  });
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

/** Why a push registration attempt ended where it did — surfaced in Settings. */
export type PushRegistrationResult =
  | 'registered'
  | 'permission-denied'
  | 'unavailable'
  | 'token-error'
  | 'register-failed';

/**
 * Register the current device with the backend (idempotent upsert). Returns a
 * diagnostic result so the Settings screen can tell the merchant exactly what
 * happened instead of failing silently.
 */
export async function registerDeviceForPush(
  options: { requestPermission?: boolean } = {},
): Promise<PushRegistrationResult> {
  if (registrationInFlight) {
    if (options.requestPermission) {
      return registrationInFlight.then((result) =>
        result === 'permission-denied' ? registerDeviceForPush(options) : result,
      );
    }
    return registrationInFlight;
  }
  registrationInFlight = (async (): Promise<PushRegistrationResult> => {
    if (!Device.isDevice) return 'unavailable';
    const granted = options.requestPermission
      ? await requestPushPermission()
      : (await Notifications.getPermissionsAsync()).granted;
    if (!granted) return 'permission-denied';
    await ensureNotificationChannel();
    const token = await getExpoPushToken();
    if (!token) return 'token-error';
    try {
      await endpoints.registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android');
      return 'registered';
    } catch (err) {
      console.warn('[push] device register failed:', err);
      return 'register-failed';
    }
  })().finally(() => {
    registrationInFlight = null;
  });
  return registrationInFlight;
}

/** Unregister this device on logout. */
export async function unregisterDeviceForPush(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  try {
    await endpoints.unregisterDevice(token);
  } catch (error) {
    console.warn('[push] device unregister failed:', error);
  }
}

/** Configure a deep-link router for notification taps (e.g. new order). */
export interface NotificationTap {
  id: string;
  data: Record<string, unknown>;
}

function notificationTapFromResponse(
  response: Notifications.NotificationResponse | null,
): NotificationTap | null {
  if (!response) return null;
  return {
    id: response.notification.request.identifier,
    data: response.notification.request.content.data as Record<string, unknown>,
  };
}

/** Notification which launched the app or was tapped before JS listeners mounted. */
export async function getLastNotificationTap(): Promise<NotificationTap | null> {
  return notificationTapFromResponse(await Notifications.getLastNotificationResponseAsync());
}

export async function clearLastNotificationTap(): Promise<void> {
  await Notifications.clearLastNotificationResponseAsync();
}

export function addNotificationResponseListener(handler: (tap: NotificationTap) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const tap = notificationTapFromResponse(response);
    if (tap) handler(tap);
  });
}

/** Re-register when native APNs/FCM tokens rotate; Expo push tokens are re-read. */
export function addPushTokenRefreshListener() {
  return Notifications.addPushTokenListener(() => {
    void registerDeviceForPush().catch((err) => {
      console.warn('[push] could not refresh device registration:', err);
    });
  });
}

/**
 * Decide which route a notification payload should open. Matches the payload
 * `type` values the backend sends in services/pushService.js callers:
 *   order_created, order_status (orderRoutes/mobileRoutes)
 *   order_paid (paymentWebhooks)
 *   subscription_active (paymentWebhooks)
 *   low_stock (inventoryRoutes), plan_* (billingCron), security (password
 *   reset), welcome — also replayed when tapping a row in the Notifications
 *   screen, so keep this the single source of truth for both paths.
 */
export function routeForNotification(data: Record<string, unknown>): string | null {
  const type = data?.type;
  if (type === 'order_created' || type === 'order_status' || type === 'order_paid' || type === 'payment_received') {
    const id = data?.orderId ?? data?.order_id;
    return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ? `/orders/${id}`
      : '/orders';
  }
  if (type === 'low_stock') return '/products';
  if (type === 'subscription_active') return '/settings';
  // Billing lifecycle (trial reminder / past due / renewal / suspension) and
  // security events all live in Settings. welcome + contact_message have no
  // dedicated screen yet — they stay read-only rows in the inbox.
  if (typeof type === 'string' && (type.startsWith('plan_') || type === 'security')) return '/settings';
  return null;
}
