import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { ChevronLeft, BookOpen, Share2, BookmarkPlus, ArrowUpRight } from 'lucide-react-native';

const ARTICLES = [
  { id: '1', title: '5 Ways to Reduce Plastic at Home', source: 'LinkedIn Top Picks', readTime: '3 min read', date: '16 Apr', category: 'LIFESTYLE' },
  { id: '2', title: 'The Future of E-Waste Recycling in India', source: 'Sustainability Weekly', readTime: '5 min read', date: '14 Apr', category: 'TECHNOLOGY' },
  { id: '3', title: 'How Composting Can Save 50kg of CO2', source: 'Eco Warriors', readTime: '4 min read', date: '10 Apr', category: 'GUIDE' },
  { id: '4', title: 'Understanding Your Carbon Footprint', source: 'Global Green', readTime: '6 min read', date: '05 Apr', category: 'EDUCATION' },
];

export function KnowledgeHubScreen({ navigation }: any) {
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
        
        {/* Featured Article */}
        <TouchableOpacity 
          style={styles.featuredCard} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ArticleDetail', { title: ARTICLES[0].title })}
        >
          <View style={styles.featuredImgPlaceholder}>
            <BookOpen size={48} color="white" />
          </View>
          <View style={styles.featuredContent}>
            <Text style={styles.categoryTag}>{ARTICLES[0].category}</Text>
            <Text style={styles.featuredTitle}>{ARTICLES[0].title}</Text>
            <Text style={styles.featuredSub}>{ARTICLES[0].source} • {ARTICLES[0].readTime}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Latest articles</Text>

        {/* List of Articles */}
        <View style={styles.listContainer}>
          {ARTICLES.slice(1).map((article) => (
            <TouchableOpacity 
              key={article.id} 
              style={styles.articleRow}
              onPress={() => navigation.navigate('ArticleDetail', { title: article.title })}
            >
              <View style={styles.articleThumbnail}>
                 <BookOpen size={20} color="#16a34a" />
              </View>
              <View style={styles.articleInfo}>
                <Text style={styles.categoryLabel}>{article.category}</Text>
                <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
                <Text style={styles.articleMeta}>{article.date} • {article.readTime}</Text>
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
  
  featuredCard: { backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: {height: 4, width: 0}, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 32 },
  featuredImgPlaceholder: { height: 180, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  featuredContent: { padding: 20 },
  categoryTag: { color: '#16a34a', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  featuredTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8, lineHeight: 28 },
  featuredSub: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  listContainer: { gap: 16 },
  articleRow: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 16, alignItems: 'center', elevation: 1 },
  articleThumbnail: { width: 70, height: 70, backgroundColor: '#f0fdf4', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  articleInfo: { flex: 1 },
  categoryLabel: { color: '#0284c7', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  articleTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 6, lineHeight: 20 },
  articleMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
});
