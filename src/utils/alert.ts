import { Alert, Platform } from 'react-native';

type AlertButton = { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };

// react-native-web's Alert.alert() is a no-op — falls back to window.alert/confirm on web.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtn = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];
  if (window.confirm(text)) {
    actionBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
