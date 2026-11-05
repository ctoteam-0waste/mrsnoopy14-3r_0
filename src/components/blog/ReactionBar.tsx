import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlogReactions, fetchBlogStats, sendBlogReaction, sendBlogView } from '../../services/blog';
import { useTheme, makeStyles } from '../../theme';

const KINDS: { key: keyof BlogReactions; emoji: string; label: string }[] = [
  { key: 'like', emoji: '👍', label: 'Useful' },
  { key: 'love', emoji: '💚', label: 'Loved it' },
  { key: 'recycle', emoji: '♻️', label: 'Will try this' },
];

// "Was this helpful?" — same counts as on 0waste.co.in. Also records one view of the post.
export function ReactionBar({ slug }: { slug: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [counts, setCounts] = useState<BlogReactions | null>(null);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const storeKey = `kv-blog-react:${slug}`;

  useEffect(() => {
    AsyncStorage.getItem(storeKey).then((v) => setMine(new Set((v ?? '').split(',').filter(Boolean)))).catch(() => {});
    fetchBlogStats(slug).then((s) => setCounts(s.reactions)).catch(() => {});
    sendBlogView(slug);
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: keyof BlogReactions) => {
    const undo = mine.has(key);
    const next = new Set(mine);
    if (undo) next.delete(key);
    else next.add(key);
    setMine(next);
    AsyncStorage.setItem(storeKey, [...next].join(',')).catch(() => {});
    setCounts((c) => (c ? { ...c, [key]: Math.max(0, c[key] + (undo ? -1 : 1)) } : c));
    sendBlogReaction(slug, key, undo);
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Was this helpful?</Text>
      <View style={styles.row}>
        {KINDS.map(({ key, emoji, label }) => {
          const on = mine.has(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => toggle(key)}
              style={[styles.btn, on && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={[styles.label, on && { color: colors.primary }]}>{label}</Text>
              {!!counts && counts[key] > 0 && <Text style={styles.count}>{counts[key]}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: { marginTop: 36, paddingTop: 22, borderTopWidth: 1, borderTopColor: c.border, gap: 12 },
  title: { fontSize: 17, fontWeight: '800', color: c.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, minHeight: 42, borderRadius: 100, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  emoji: { fontSize: 17 },
  label: { fontSize: 13.5, fontWeight: '700', color: c.text },
  count: { fontSize: 13.5, fontWeight: '600', color: c.textMuted },
}));
