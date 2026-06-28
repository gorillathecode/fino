import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FINO Copilot',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  return 'granted';
}

export async function scheduleOverdueReminder(
  invoiceNumber: string,
  customerName: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rechnung ueberfaellig',
      body: `${invoiceNumber} von ${customerName} ist ueberfaellig.`,
      data: { type: 'overdue_invoice' },
    },
    trigger: null,
  });
}

export async function scheduleLiquidityWarning(days: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Copilot Warnung',
      body: `In ${days} Tagen koennte ein Liquiditaetsengpass entstehen.`,
      data: { type: 'liquidity_warning' },
    },
    trigger: null,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
