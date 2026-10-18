const fs = require('fs');
const p = 'C:/Users/minna/Desktop/GhanaStores/mobile/app';

let s = fs.readFileSync(p + '/(tabs)/orders/[id].tsx', 'utf8');

// Remove duplicate useSafeBack import (orders/[id] still has the duplicate)
const dup = "import { useSafeBack } from '@/lib/useSafeBack';\nimport { useSafeBack } from '@/lib/useSafeBack';";
if (s.includes(dup)) {
  s = s.replace(dup, "import { useSafeBack } from '@/lib/useSafeBack';");
  console.log('Removed duplicate useSafeBack import');
} else {
  console.log('No duplicate found');
}

// Fix orphaned Appbar.Header: add back action to the orders/[id] header
const orphan = `<Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title={`Order #${order.orderNumber}`} />
        <Appbar.Action
          icon="share-variant"
          onPress={onShareReceipt}
          disabled={sharing}
          accessibilityLabel="Share receipt"
        />
      </Appbar.Header>`;
const fixed = `<Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title={`Order #${order.orderNumber}`} />
        <Appbar.Action
          icon="share-variant"
          onPress={onShareReceipt}
          disabled={sharing}
          accessibilityLabel="Share receipt"
        />
      </Appbar.Header>`;
if (s.includes(orphan)) {
  s = s.replace(orphan, fixed);
  console.log('Added Appbar.BackAction to orders/[id] header');
} else {
  console.log('Unsure about orphaned header match');
}

fs.writeFileSync(p + '/(tabs)/orders/[id].tsx', s);
console.log('Done');
