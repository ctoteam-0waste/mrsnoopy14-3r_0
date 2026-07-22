import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Clock } from 'lucide-react-native';
import { ARTICLES } from '../data/articles';

export function KnowledgeHubScreen({ navigation }: any) {
  const [featured, ...rest] = ARTICLES;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Knowledge hub</Text>
        <View style={styles.placeholderBox} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Featured article — full-bleed image with gradient overlay */}
        <TouchableOpacity
          style={styles.featuredCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ArticleDetail', { id: featured.id })}
        >
          <Image source={{ uri: featured.image }} style={styles.featuredImg} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(2,6,23,0.55)', 'rgba(2,6,23,0.92)']}
            style={styles.featuredOverlay}
          />
          <View style={styles.featuredContent}>
            <View style={[styles.categoryChip, { backgroundColor: featured.categoryColor }]}>
              <Text style={styles.categoryChipText}>{featured.category}</Text>
            </View>
            <Text style={styles.featuredTitle}>{featured.title}</Text>
            <View style={styles.metaRow}>
              <Clock size={12} color="rgba(255,255,255,0.75)" />
              <Text style={styles.featuredMeta}>{featured.readTime} • {featured.date}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Latest articles</Text>

        {/* Article list with image thumbnails */}
        <View style={styles.listContainer}>
          {rest.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleRow}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ArticleDetail', { id: article.id })}
            >
              <Image source={{ uri: article.image }} style={styles.articleThumbnail} resizeMode="cover" />
              <View style={styles.articleInfo}>
                <Text style={[styles.categoryLabel, { color: article.categoryColor }]}>{article.category}</Text>
                <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
                <View style={styles.metaRow}>
                  <Clock size={11} color="#94a3b8" />
                  <Text style={styles.articleMeta}>{article.readTime} • {article.date}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtn: { padding: 8, backgroundColor: 'white', borderRadius: 12, elevation: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  placeholderBox: { width: 40 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },

  featuredCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 28, elevation: 4, shadowColor: '#000', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.15, shadowRadius: 14, backgroundColor: '#0f172a' },
  featuredImg: { width: '100%', height: 240 },
  featuredOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170 },
  featuredContent: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18 },
  categoryChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginBottom: 10 },
  categoryChipText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  featuredTitle: { fontSize: 20, fontWeight: '800', color: 'white', lineHeight: 27, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  featuredMeta: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 14 },
  listContainer: { gap: 14 },
  articleRow: { flexDirection: 'row', backgroundColor: 'white', padding: 10, borderRadius: 18, alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#f1f5f9' },
  articleThumbnail: { width: 86, height: 86, borderRadius: 14, marginRight: 14, backgroundColor: '#f0fdf4' },
  articleInfo: { flex: 1, paddingRight: 4 },
  categoryLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 },
  articleTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 6, lineHeight: 20 },
  articleMeta: { fontSize: 11.5, color: '#94a3b8', fontWeight: '500' },
});
