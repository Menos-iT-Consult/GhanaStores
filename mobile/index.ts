import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from '@/android-widgets/widget-task-handler';

// Home-screen widgets (Android): headless task that renders StoreWidget from
// the cached snapshot. Must be registered at the entry point, outside React.
registerWidgetTaskHandler(widgetTaskHandler);
