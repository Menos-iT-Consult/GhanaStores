'use no memo';

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { EMPTY_SNAPSHOT, type WidgetSnapshot } from '@/widgets/snapshot';

/**
 * DiDwa store home-screen widget (Android AppWidget).
 *
 * Pure function of its props: only FlexWidget/TextWidget primitives, no
 * hooks, no app imports beyond the snapshot type. Tapping anywhere opens the
 * app; the "New sale" row deep-links straight to the POS tab via `didwa://`
 * (scheme is registered in app.json).
 *
 * NOTE: widget RemoteViews use the system font — custom families are not
 * reliable here, so none are set. Currency uses "GHS" text because the
 * widget renderer may lack the ₵ glyph on some devices.
 */

export const STORE_WIDGET_NAME = 'StoreWidget';

function fmtGhs(n: number): string {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `GHS ${v.toFixed(2)}`;
}

export function StoreWidget({ snapshot }: { snapshot?: WidgetSnapshot }) {
  const s = snapshot ?? EMPTY_SNAPSHOT;
  const hasData = snapshot != null && snapshot.updatedAt !== EMPTY_SNAPSHOT.updatedAt;
  const subtitle = !hasData
    ? 'Open the app to sync'
    : s.storeName
      ? `${s.storeName}`
      : 'Store overview';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text="DiDwa Seller"
        style={{ color: '#0066FF', fontSize: 12, fontWeight: 'bold' }}
        maxLines={1}
      />
      <TextWidget
        text={subtitle}
        style={{ color: '#64748B', fontSize: 11 }}
        maxLines={1}
        truncate="END"
      />
      <FlexWidget
        style={{ flexDirection: 'row', marginTop: 8 }}
      >
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text="Today" style={{ color: '#64748B', fontSize: 10 }} />
          <TextWidget
            text={fmtGhs(s.todayRevenue)}
            style={{ color: '#0F172A', fontSize: 15, fontWeight: 'bold' }}
            maxLines={1}
          />
        </FlexWidget>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text="Pending" style={{ color: '#64748B', fontSize: 10 }} />
          <TextWidget
            text={String(s.pendingOrders)}
            style={{ color: '#0F172A', fontSize: 15, fontWeight: 'bold' }}
            maxLines={1}
          />
        </FlexWidget>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text="Low stock" style={{ color: '#64748B', fontSize: 10 }} />
          <TextWidget
            text={String(s.lowStockCount)}
            style={{ color: '#0F172A', fontSize: 15, fontWeight: 'bold' }}
            maxLines={1}
          />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0066FF',
          borderRadius: 8,
          marginTop: 8,
          paddingVertical: 6,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'didwa://pos' }}
      >
        <TextWidget
          text="＋  New sale"
          style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}
          maxLines={1}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
