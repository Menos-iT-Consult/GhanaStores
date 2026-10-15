import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { StoreWidget, STORE_WIDGET_NAME } from './StoreWidget';
import { readWidgetSnapshot } from '@/widgets/snapshot';

/**
 * Headless entry point the Android OS calls when a home-screen widget needs
 * rendering (added / resized / periodic update). Runs outside React — no
 * hooks, no navigation, no network. Reads the last snapshot the app saved and
 * renders it; on a fresh install with no snapshot yet, shows the empty state.
 *
 * WIDGET_CLICK with clickAction OPEN_APP / OPEN_URI is handled natively by
 * the OS (opens the app / deep link) and never reaches this handler.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== STORE_WIDGET_NAME) return;
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const snapshot = await readWidgetSnapshot().catch(() => null);
  props.renderWidget(<StoreWidget snapshot={snapshot ?? undefined} />);
}
