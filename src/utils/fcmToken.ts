// Android's device push token already is an FCM token, and web has no push, so only
// iOS (fcmToken.ios.ts) needs to exchange it.
export async function getFcmToken(deviceToken: string): Promise<string | null> {
  return deviceToken;
}
