// Blog posts come from 0waste.co.in — the single place the team writes, edits and
// deletes posts (its /admin). karmaverse.earth only reads this public feed, so both
// sites always show the same posts with nothing to publish twice.

export const BLOG_SOURCE = 'https://0waste.co.in';

export type BlogPost = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  date: string; // YYYY-MM-DD
  readTime: string;
  author: string | null;
  image: string | null;
  imageCredit: string | null;
  featured: boolean;
  keywords: string[];
  url: string; // canonical article on 0waste.co.in
  /** Call-to-action box for the end of the post (chosen on 0waste.co.in from the category). */
  cta?: BlogCta;
};

export type BlogCta = {
  kind: 'karmaverse' | 'service';
  eyebrow: string;
  title: string;
  text: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
};

export type BlogPostWithBody = BlogPost & { html: string; faq: { q: string; a: string }[]; toc?: { id: string; text: string }[] };

let listCache: { at: number; posts: BlogPost[] } | null = null;
const TTL = 5 * 60_000;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BLOG_SOURCE}${path}`, { headers: { Accept: 'application/json' } });
  if (res.status === 404) throw Object.assign(new Error('Not found'), { notFound: true });
  if (!res.ok) throw new Error(`Blog feed error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchBlogPosts(force = false): Promise<BlogPost[]> {
  if (!force && listCache && Date.now() - listCache.at < TTL) return listCache.posts;
  const { posts } = await getJson<{ posts: BlogPost[] }>('/api/blog');
  listCache = { at: Date.now(), posts };
  return posts;
}

/** Cached list entry (for an instant header while the full article loads). */
export function peekBlogPost(slug: string): BlogPost | undefined {
  return listCache?.posts.find((p) => p.slug === slug);
}

export async function fetchBlogPost(slug: string): Promise<BlogPostWithBody> {
  const { post } = await getJson<{ post: BlogPostWithBody }>(`/api/blog/${encodeURIComponent(slug)}`);
  return post;
}

/* ---------- reactions, views, most read (stored on 0waste.co.in) ---------- */

export type BlogReactions = { like: number; love: number; recycle: number };

export async function fetchBlogStats(slug: string): Promise<{ views: number; reactions: BlogReactions }> {
  return getJson(`/api/blog/stats?slug=${encodeURIComponent(slug)}`);
}

export async function fetchMostRead(): Promise<{ mostRead: string[]; views: Record<string, number> }> {
  return getJson('/api/blog/stats');
}

function postStats(body: object) {
  return fetch(`${BLOG_SOURCE}/api/blog/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}

const viewed = new Set<string>();
/** Counts one view per post per app session. */
export function sendBlogView(slug: string) {
  if (viewed.has(slug)) return;
  viewed.add(slug);
  postStats({ slug, action: 'view' });
}

export function sendBlogReaction(slug: string, reaction: keyof BlogReactions, undo: boolean) {
  postStats({ slug, action: 'react', reaction, undo });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatBlogDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
}

/** Category accent colours, matching the Knowledge hub chips. */
export function categoryColor(category: string) {
  switch (category) {
    case 'ESG': return '#2563eb';
    case 'Circular Economy': return '#059669';
    case 'EPR': return '#d97706';
    case 'Carbon & Net Zero': return '#0891b2';
    case 'KarmaVerse': return '#16a34a';
    case 'Community & Events': return '#e11d48';
    default: return '#16a34a';
  }
}
