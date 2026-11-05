import { Platform } from 'react-native';

// Web-only: sets the tab title, meta description and canonical URL for a screen,
// and returns a function that restores the previous values when the screen closes.
// (NavigationContainer's documentTitle is disabled app-wide, so screens opt in.)
export function setPageMeta(meta: { title?: string; description?: string; canonical?: string }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return () => {};
  const prevTitle = document.title;
  const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  const canon = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const prevDesc = desc?.content;
  const prevCanon = canon?.href;

  if (meta.title) document.title = meta.title;
  if (meta.description && desc) desc.content = meta.description;
  if (meta.canonical && canon) canon.href = meta.canonical;

  return () => {
    document.title = prevTitle;
    if (desc && prevDesc !== undefined) desc.content = prevDesc;
    if (canon && prevCanon !== undefined) canon.href = prevCanon;
  };
}
