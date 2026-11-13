import { getToken } from './tokenStore';

// Back on a page that can be opened straight from a link (About us, legal pages,
// news, blog): go back when there is a page behind it, otherwise go home, the app
// home for a signed-in user and the landing page for a guest.
export async function goBackOrHome(navigation: any): Promise<void> {
  if (navigation.canGoBack()) { navigation.goBack(); return; }
  const token = await getToken().catch(() => null);
  navigation.navigate(token ? 'App' : 'Splash');
}
