import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Check, ChevronLeft, Clock, ExternalLink, Facebook, Link2, Linkedin, MessageCircle, Share2, Twitter } from 'lucide-react-native';
import {
  BLOG_SOURCE, BlogCta, BlogPost, BlogPostWithBody, categoryColor, fetchBlogPost, fetchBlogPosts, formatBlogDate, peekBlogPost,
} from '../services/blog';
import { setPageMeta } from '../utils/pageMeta';
import { getToken } from '../utils/tokenStore';
import { WebFooter } from '../components/shared/WebFooter';
import { NewsletterBox } from '../components/blog/NewsletterBox';
import { ReactionBar } from '../components/blog/ReactionBar';
import { useTheme, makeStyles, ThemeColors } from '../theme';

// karmaverse.earth/blog/<slug> — the full article, read live from 0waste.co.in.
// The canonical URL points at 0waste.co.in so search engines credit the original.

const PROSE_STYLE_ID = 'kv-blog-prose';
const PROSE_CSS = `
.kv-prose { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 17px; line-height: 1.75; color: var(--kv-muted); overflow-wrap: anywhere; }
.kv-prose > * + * { margin-top: 1.1em; }
.kv-prose p, .kv-prose ul, .kv-prose ol, .kv-prose table, .kv-prose blockquote { margin-bottom: 0; }
.kv-prose h2 { scroll-margin-top: 16px; margin: 1.9em 0 0; font-size: 24px; line-height: 1.25; font-weight: 800; color: var(--kv-text); }
.kv-prose h3 { margin: 1.5em 0 0; font-size: 19px; line-height: 1.3; font-weight: 800; color: var(--kv-text); }
.kv-prose strong { color: var(--kv-text); }
.kv-prose a { color: var(--kv-primary); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
.kv-prose ul, .kv-prose ol { padding-left: 1.3em; }
.kv-prose li + li { margin-top: 0.4em; }
.kv-prose li::marker { color: var(--kv-primary); }
.kv-prose blockquote { margin-left: 0; border-left: 3px solid var(--kv-primary); padding: 0.2em 0 0.2em 1em; font-style: italic; color: var(--kv-text); }
.kv-prose img { max-width: 100%; border-radius: 16px; }
.kv-prose table { width: 100%; border-collapse: collapse; font-size: 0.92em; display: block; overflow-x: auto; }
.kv-prose th, .kv-prose td { border-bottom: 1px solid var(--kv-border); padding: 0.6em 0.5em; text-align: left; vertical-align: top; }
.kv-prose th { color: var(--kv-text); }
.kv-prose code { background: var(--kv-soft); border-radius: 6px; padding: 0.1em 0.35em; font-size: 0.88em; }
.kv-prose hr { border: 0; border-top: 1px solid var(--kv-border); margin: 2em 0; }
`;

function ensureProseCss() {
  if (typeof document === 'undefined' || document.getElementById(PROSE_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = PROSE_STYLE_ID;
  el.textContent = PROSE_CSS;
  document.head.appendChild(el);
}

/** Web: renders the article HTML. Links to other posts stay on karmaverse.earth; other links open in a new tab. */
function ArticleHtml({ html, colors, onOpenPost }: { html: string; colors: ThemeColors; onOpenPost: (slug: string) => void }) {
  useEffect(ensureProseCss, []);
  const vars = {
    '--kv-text': colors.text, '--kv-muted': colors.textMuted, '--kv-primary': colors.primary,
    '--kv-border': colors.border, '--kv-soft': colors.surfaceAlt,
  } as React.CSSProperties;

  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a') as HTMLAnchorElement | null;
    if (!a?.href) return;
    e.preventDefault();
    const m = a.href.match(/^https:\/\/(?:www\.)?0waste\.co\.in\/blog\/([a-z0-9-]+)\/?$/);
    if (m) onOpenPost(m[1]);
    else window.open(a.href, '_blank', 'noopener');
  };

  return React.createElement('div', { className: 'kv-prose', style: vars, onClick, dangerouslySetInnerHTML: { __html: html } });
}

export function BlogPostScreen({ route, navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const slug: string = route.params?.slug ?? '';

  const [post, setPost] = useState<BlogPostWithBody | null>(null);
  const [preview, setPreview] = useState<BlogPost | undefined>(() => peekBlogPost(slug));
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [more, setMore] = useState<BlogPost[]>([]);

  useEffect(() => {
    let alive = true;
    setState('loading');
    setPost(null);
    setPreview(peekBlogPost(slug));
    fetchBlogPost(slug)
      .then((p) => alive && (setPost(p), setState('ready')))
      .catch((e) => alive && setState(e?.notFound ? 'notfound' : 'error'));
    fetchBlogPosts()
      .then((all) => alive && setMore(all.filter((p) => p.slug !== slug).slice(0, 3)))
      .catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  const head = post ?? preview;
  useEffect(() => {
    if (!head) return;
    return setPageMeta({ title: `${head.title} — KarmaVerse`, description: head.summary, canonical: head.url });
  }, [head?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPost = (s: string) => navigation.push('BlogPost', { slug: s });
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Blog'));
  const shareUrl = `https://karmaverse.earth/blog/${slug}`;

  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const onScroll = (e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const total = contentSize.height - layoutMeasurement.height;
    setProgress(total > 0 ? Math.min(1, Math.max(0, contentOffset.y / total)) : 0);
  };
  const jumpTo = (id: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const shareTitle = head?.title ?? 'KarmaVerse blog';
  const shareLinks = [
    { name: 'WhatsApp', Icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}` },
    { name: 'LinkedIn', Icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
    { name: 'X', Icon: Twitter, href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}` },
    { name: 'Facebook', Icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
  ];
  const openLink = (href: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(href, '_blank', 'noopener,noreferrer');
    else Linking.openURL(href);
  };
  const copyLink = async () => {
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else await Share.share({ message: `${shareTitle} — ${shareUrl}` });
    } catch {
      // clipboard blocked
    }
  };

  // KarmaVerse boxes go to the in-app pickup (or login); service boxes open 0waste.co.in.
  const ctaPress = async (href: string) => {
    if (/^https:\/\/karmaverse\.earth\/?$/.test(href)) {
      const token = await getToken().catch(() => null);
      return navigation.navigate(token ? 'SchedulePickup' : 'Login');
    }
    openLink(href);
  };

  const handleShare = async () => {
    const title = head?.title ?? 'KarmaVerse blog';
    try {
      if (Platform.OS === 'web' && (navigator as any)?.share) await (navigator as any).share({ title, url: shareUrl });
      else if (Platform.OS === 'web' && (navigator as any)?.clipboard) await (navigator as any).clipboard.writeText(shareUrl);
      else await Share.share({ message: `${title} — ${shareUrl}` });
    } catch {
      // share sheet dismissed
    }
  };

  const body = useMemo(() => {
    if (state === 'loading') return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
    if (state === 'notfound') {
      return (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>This post isn't available</Text>
          <Text style={styles.noticeText}>It may have been moved or removed.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Blog')}>
            <Text style={styles.primaryBtnText}>See all posts</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (state === 'error' || !post) {
      return (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Couldn't load this post. Check your connection and try again.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('BlogPost', { slug })}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (Platform.OS === 'web') return <ArticleHtml html={post.html} colors={colors} onOpenPost={openPost} />;
    // Native app (not shown in the app today): short summary + link to the full article.
    return (
      <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openURL(post.url)}>
        <Text style={styles.primaryBtnText}>Read the full article</Text>
      </TouchableOpacity>
    );
  }, [state, post, colors, styles]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` as any }]} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={back} accessibilityLabel="All posts">
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare} accessibilityLabel="Share">
            <Share2 size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.article}>
          {head && (
            <>
              <Text style={[styles.category, { color: categoryColor(head.category) }]}>{head.category.toUpperCase()}</Text>
              <Text style={styles.title} accessibilityRole="header">{head.title}</Text>
              {!!head.summary && <Text style={styles.summary}>{head.summary}</Text>}
              <View style={styles.metaRow}>
                <Clock size={13} color={colors.textMuted} />
                <Text style={styles.meta}>
                  {formatBlogDate(head.date)} • {head.readTime} read{head.author ? ` • ${head.author}` : ''}
                </Text>
              </View>
              {!!head.image && <Image source={{ uri: head.image }} style={styles.hero} resizeMode="cover" accessibilityIgnoresInvertColors />}
              {!!head.imageCredit && <Text style={styles.credit}>{head.imageCredit}</Text>}
            </>
          )}

          {Platform.OS === 'web' && state === 'ready' && (post?.toc?.length ?? 0) >= 3 && (
            <View style={styles.toc}>
              <Text style={styles.tocTitle}>IN THIS ARTICLE</Text>
              {post!.toc!.map((t, i) => (
                <TouchableOpacity key={t.id} style={styles.tocRow} onPress={() => jumpTo(t.id)}>
                  <Text style={styles.tocNum}>{i + 1}</Text>
                  <Text style={styles.tocText}>{t.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {body}

          {state === 'ready' && post && <ReactionBar slug={post.slug} />}

          {state === 'ready' && post && (
            <View style={styles.shareBox}>
              <Text style={styles.shareTitle}>Pass it on.</Text>
              <View style={styles.shareRow}>
                {shareLinks.map(({ name, Icon, href }) => (
                  <TouchableOpacity key={name} style={styles.shareBtn} onPress={() => openLink(href)} accessibilityLabel={`Share on ${name}`}>
                    <Icon size={17} color={colors.text} />
                    <Text style={styles.shareBtnText}>{name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.shareBtn} onPress={copyLink} accessibilityLabel="Copy link">
                  {copied ? <Check size={17} color={colors.primary} /> : <Link2 size={17} color={colors.text} />}
                  <Text style={styles.shareBtnText}>{copied ? 'Copied' : 'Copy link'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {state === 'ready' && post?.cta && <CtaBox cta={post.cta} onPress={ctaPress} />}

          {state === 'ready' && post && (
            <TouchableOpacity style={styles.sourceLink} onPress={() => Linking.openURL(post.url)}>
              <ExternalLink size={14} color={colors.primary} />
              <Text style={styles.sourceText}>Originally published on {BLOG_SOURCE.replace('https://', '')}</Text>
            </TouchableOpacity>
          )}

          {more.length > 0 && state !== 'loading' && (
            <View style={styles.moreBox}>
              <Text style={styles.moreTitle}>Keep reading</Text>
              {more.map((p) => (
                <TouchableOpacity key={p.slug} style={styles.moreRow} activeOpacity={0.85} onPress={() => openPost(p.slug)}>
                  {p.image ? <Image source={{ uri: p.image }} style={styles.moreThumb} resizeMode="cover" /> : <View style={[styles.moreThumb, { backgroundColor: colors.primarySoft }]} />}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.moreCat, { color: categoryColor(p.category) }]}>{p.category.toUpperCase()}</Text>
                    <Text style={styles.moreItemTitle} numberOfLines={2}>{p.title}</Text>
                    <Text style={styles.moreMeta}>{p.readTime} read</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {state === 'ready' && <NewsletterBox />}
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </SafeAreaView>
  );
}

function CtaBox({ cta, onPress }: { cta: BlogCta; onPress: (href: string) => void }) {
  const styles = useStyles();
  const dark = cta.kind === 'service';
  return (
    <View style={[styles.cta, dark ? styles.ctaDark : styles.ctaLight]}>
      <Text style={[styles.ctaEyebrow, dark && { color: '#C8F26A' }]}>{cta.eyebrow.toUpperCase()}</Text>
      <Text style={[styles.ctaTitle, dark && { color: '#F2F6F3' }]}>{cta.title}</Text>
      <Text style={[styles.ctaText, dark && { color: '#C3D1CA' }]}>{cta.text}</Text>
      <View style={styles.ctaBtns}>
        <TouchableOpacity style={[styles.ctaPrimary, dark && { backgroundColor: '#C8F26A' }]} onPress={() => onPress(cta.primary.href)}>
          <Text style={[styles.ctaPrimaryText, dark && { color: '#07140E' }]}>{cta.primary.label}</Text>
          <ArrowRight size={16} color={dark ? '#07140E' : '#fff'} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctaSecondary, dark && { borderColor: 'rgba(255,255,255,0.25)' }]} onPress={() => onPress(cta.secondary.href)}>
          <Text style={[styles.ctaSecondaryText, dark && { color: '#F2F6F3' }]}>{cta.secondary.label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, zIndex: 10 },
  progressBar: { height: 4, backgroundColor: c.primary, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  toc: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 18, gap: 10, marginTop: 10, marginBottom: 26 },
  tocTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: c.primary, marginBottom: 2 },
  tocRow: { flexDirection: 'row', gap: 12 },
  tocNum: { width: 18, textAlign: 'right', fontSize: 13, color: c.textFaint, fontWeight: '700', lineHeight: 21 },
  tocText: { flex: 1, fontSize: 15, color: c.text, fontWeight: '600', lineHeight: 21 },
  shareBox: { marginTop: 24, gap: 12 },
  shareTitle: { fontSize: 17, fontWeight: '800', color: c.text },
  shareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, minHeight: 42, borderRadius: 100, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  shareBtnText: { fontSize: 13.5, fontWeight: '700', color: c.text },

  cta: { marginTop: 28, borderRadius: 24, padding: 24, gap: 10 },
  ctaLight: { backgroundColor: c.primarySoft },
  ctaDark: { backgroundColor: '#07140E' },
  ctaEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: c.primary },
  ctaTitle: { fontSize: 23, fontWeight: '900', color: c.text, lineHeight: 29 },
  ctaText: { fontSize: 15, color: c.textMuted, lineHeight: 23 },
  ctaBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  ctaPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primary, paddingHorizontal: 20, minHeight: 46, borderRadius: 100 },
  ctaPrimaryText: { color: c.onPrimary, fontWeight: '800', fontSize: 14.5 },
  ctaSecondary: { justifyContent: 'center', paddingHorizontal: 20, minHeight: 46, borderRadius: 100, borderWidth: 1, borderColor: c.border },
  ctaSecondaryText: { color: c.text, fontWeight: '700', fontSize: 14.5 },

  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, maxWidth: 760, width: '100%', alignSelf: 'center' },
  iconBtn: { padding: 8, backgroundColor: c.surface, borderRadius: 12, elevation: 1 },

  article: { paddingHorizontal: 20, paddingBottom: 56, paddingTop: 8, maxWidth: 760, width: '100%', alignSelf: 'center', flexGrow: 1 },
  category: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: '900', color: c.text, lineHeight: 38, marginBottom: 12 },
  summary: { fontSize: 17, color: c.textMuted, lineHeight: 26, marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 },
  meta: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  hero: { width: '100%', aspectRatio: 16 / 9, borderRadius: 20, backgroundColor: c.surfaceAlt, marginBottom: 8 },
  credit: { fontSize: 11.5, color: c.textFaint, textAlign: 'right', marginBottom: 18 },

  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22 },
  sourceText: { color: c.primary, fontWeight: '700', fontSize: 13 },

  moreBox: { marginTop: 28, gap: 12 },
  moreTitle: { fontSize: 20, fontWeight: '900', color: c.text, marginBottom: 4 },
  moreRow: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: c.surface, borderRadius: 18, padding: 10, borderWidth: 1, borderColor: c.border },
  moreThumb: { width: 84, height: 64, borderRadius: 12 },
  moreCat: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 3 },
  moreItemTitle: { fontSize: 15, fontWeight: '700', color: c.text, lineHeight: 20 },
  moreMeta: { fontSize: 11.5, color: c.textFaint, marginTop: 3 },

  notice: { alignItems: 'center', gap: 12, marginTop: 30 },
  noticeTitle: { fontSize: 20, fontWeight: '800', color: c.text },
  noticeText: { fontSize: 15, color: c.textMuted, textAlign: 'center' },
  primaryBtn: { alignSelf: 'center', backgroundColor: c.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 100, marginTop: 8 },
  primaryBtnText: { color: c.onPrimary, fontWeight: '800' },
}));
