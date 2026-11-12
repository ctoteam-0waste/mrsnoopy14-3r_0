import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Share, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Heart, Clock, Lightbulb } from 'lucide-react-native';
import { getArticleById, ARTICLES, articleThumb } from '../data/articles';
import { useTheme, makeStyles } from '../theme';

// Liked Knowledge hub articles, kept on this device (articles are built into the app).
const LIKED_KEY = 'likedArticles';
async function readLikedArticles(): Promise<string[]> {
  try {
    const ids = JSON.parse((await AsyncStorage.getItem(LIKED_KEY)) || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function ArticleDetailScreen({ route, navigation }: any) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const article = getArticleById(route.params?.id);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let active = true;
    setLiked(false);
    readLikedArticles().then((ids) => { if (active) setLiked(ids.includes(article.id)); });
    return () => { active = false; };
  }, [article.id]);

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    readLikedArticles().then((ids) => {
      const updated = next ? [...new Set([...ids, article.id])] : ids.filter((id) => id !== article.id);
      return AsyncStorage.setItem(LIKED_KEY, JSON.stringify(updated));
    }).catch(() => {});
  };

  const handleShare = async () => {
    const message = `${article.title} — read it on KarmaVerse: https://karmaverse.earth`;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.share) {
        await (navigator as any).share({ title: article.title, text: message, url: 'https://karmaverse.earth' });
      } else {
        await Share.share({ message });
      }
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  // Up-next: the next article in the list, wrapping around
  const currentIndex = ARTICLES.findIndex((a) => a.id === article.id);
  const nextArticle = ARTICLES[(currentIndex + 1) % ARTICLES.length];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Share2 size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Article header */}
          <Text style={[styles.categoryTag, { color: article.categoryColor }]}>{article.category}</Text>
          <Text style={styles.title}>{article.title}</Text>
          <View style={styles.metaRow}>
            <Clock size={13} color={colors.textMuted} />
            <Text style={styles.meta}>{article.source} • {article.readTime} • {article.date}</Text>
          </View>

          {/* Hero image */}
          <Image source={{ uri: article.image }} style={styles.heroImg} resizeMode="cover" />

          {/* Intro — slightly larger lead paragraph */}
          <Text style={styles.intro}>{article.intro}</Text>

          {/* Content sections */}
          {article.sections.map((section, i) => (
            <View key={i}>
              <Text style={styles.subHeading}>{section.heading}</Text>
              {section.paragraphs.map((p, j) => (
                <Text key={j} style={styles.paragraph}>{p}</Text>
              ))}
              {section.fact ? (
                <View style={styles.factBox}>
                  <View style={styles.factIconWrap}>
                    <Lightbulb size={16} color="#16a34a" />
                  </View>
                  <Text style={styles.factText}>{section.fact}</Text>
                </View>
              ) : null}
            </View>
          ))}

          {/* Engagement footer */}
          <View style={styles.engagementArea}>
            <Text style={styles.engagementText}>Did you find this helpful?</Text>
            <View style={styles.engagementRow}>
              <TouchableOpacity
                style={[styles.likeBtn, liked && styles.likeBtnOn]}
                onPress={toggleLike}
                activeOpacity={0.8}
              >
                <Heart size={20} color={liked ? 'white' : '#ef4444'} fill={liked ? 'white' : 'none'} />
                <Text style={[styles.likeText, liked && styles.likeTextOn]}>{liked ? 'Liked' : 'Like'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                <Share2 size={18} color={colors.text} />
                <Text style={styles.shareText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Up next */}
          <TouchableOpacity
            style={styles.nextCard}
            activeOpacity={0.85}
            onPress={() => navigation.push('ArticleDetail', { id: nextArticle.id })}
          >
            <Image source={{ uri: articleThumb(nextArticle.image) }} style={styles.nextThumb} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>UP NEXT</Text>
              <Text style={styles.nextTitle} numberOfLines={2}>{nextArticle.title}</Text>
              <Text style={styles.nextMeta}>{nextArticle.readTime}</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtn: { padding: 8, backgroundColor: c.surface, borderRadius: 12, elevation: 1 },
  actionBtn: { padding: 8, backgroundColor: c.surface, borderRadius: 12, elevation: 1 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  categoryTag: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  title: { fontSize: 27, fontWeight: '800', color: c.text, lineHeight: 36, marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 },
  meta: { fontSize: 13, color: c.textMuted, fontWeight: '600' },

  heroImg: { width: '100%', height: 230, borderRadius: 18, marginBottom: 26, backgroundColor: c.surfaceAlt },

  intro: { fontSize: 17.5, color: c.text, lineHeight: 29, fontWeight: '600', marginBottom: 26 },
  paragraph: { fontSize: 16, color: c.textMuted, lineHeight: 28, marginBottom: 20 },
  subHeading: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 10, marginBottom: 14 },

  factBox: { flexDirection: 'row', gap: 12, backgroundColor: c.primarySoft, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 24, alignItems: 'flex-start' },
  factIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  factText: { flex: 1, fontSize: 14.5, color: c.primary, lineHeight: 23, fontWeight: '600' },

  engagementArea: { marginTop: 28, paddingTop: 24, borderTopWidth: 1, borderTopColor: c.border, alignItems: 'center' },
  engagementText: { fontSize: 14, color: c.textMuted, fontWeight: '600', marginBottom: 16 },
  engagementRow: { flexDirection: 'row', gap: 12 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: '#fecaca' },
  likeBtnOn: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  likeText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  likeTextOn: { color: 'white' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: c.border },
  shareText: { color: c.text, fontWeight: '700', fontSize: 15 },

  nextCard: { flexDirection: 'row', gap: 14, backgroundColor: c.surface, borderRadius: 18, padding: 12, marginTop: 28, alignItems: 'center', borderWidth: 1, borderColor: c.border, elevation: 1 },
  nextThumb: { width: 74, height: 74, borderRadius: 12, backgroundColor: c.surfaceAlt },
  nextLabel: { fontSize: 10, fontWeight: '800', color: '#16a34a', letterSpacing: 1, marginBottom: 4 },
  nextTitle: { fontSize: 14.5, fontWeight: '700', color: c.text, lineHeight: 19, marginBottom: 4 },
  nextMeta: { fontSize: 11.5, color: c.textFaint, fontWeight: '500' },
}));
