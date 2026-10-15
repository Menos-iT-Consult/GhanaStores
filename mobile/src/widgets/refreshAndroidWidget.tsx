import { Platform } from 'react-native';
import { readWidgetSnapshot, type WidgetSnapshot } from './snapshot';

/**
 * Push the latest in-app snapshot out to the Android home-screen widget.
 * No-op on iOS/web and when the native module is unavailable (Expo Go,
 * Jest): the dynamic require keeps those bundles free of the native import.
 */
export async function refreshAndroidWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import(
      'react-native-android-widget'
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StoreWidget, STORE_WIDGET_NAME } = require('@/android-widgets/StoreWidget') as typeof import(
      '@/android-widgets/StoreWidget'
    );
    const snapshot: WidgetSnapshot = await readWidgetSnapshot();
    await requestWidgetUpdate({
      widgetName: STORE_WIDGET_NAME,
      renderWidget: () => <StoreWidget snapshot={snapshot} />,
    });
  } catch {
    /* widget absent or native module missing: best-effort only */
  }
}
