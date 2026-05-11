import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Share } from 'react-native';
import { ChevronLeft, Share2, Heart } from 'lucide-react-native';

export function ArticleDetailScreen({ route, navigation }: any) {
  const { title } = route.params || { title: 'Understanding Sustainability' };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Share2 size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Article Header */}
          <Text style={styles.categoryTag}>LIFESTYLE</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>LinkedIn Top Picks • 5 min read • 16 Apr</Text>

          {/* Hero Image Placeholder */}
          <View style={styles.heroImg}>
            <Text style={styles.heroImgText}>Article Cover Image</Text>
          </View>

          {/* Content Body */}
          <Text style={styles.paragraph}>
            Sustainability is more than just a buzzword; it's a necessary approach to how we live, work, and consume. With global carbon emissions reaching critical levels, the power of individual household recycling has never been stronger.
          </Text>

          <Text style={styles.subHeading}>The Problem with Single-Use Plastics</Text>
          <Text style={styles.paragraph}>
            Every year, millions of tons of plastic enter our oceans. By segregating your waste at home and ensuring it reaches a verified recycling facility, you are directly preventing oceanic pollution. Simple changes—like using reusable bags and rejecting plastic straws—compound into massive global impact.
          </Text>

          <Text style={styles.subHeading}>E-Waste: The Hidden Danger</Text>
          <Text style={styles.paragraph}>
            Old laptops, phone chargers, and batteries contain hazardous chemicals like lead and mercury. When dumped in regular landfills, these leach into groundwater. Karma Credits partners with R2 certified recyclers to ensure your tech is broken down safely.
          </Text>

          {/* Engagement Footer */}
          <View style={styles.engagementArea}>
            <Text style={styles.engagementText}>Did you find this helpful?</Text>
            <TouchableOpacity style={styles.likeBtn}>
              <Heart size={20} color="#ef4444" />
              <Text style={styles.likeText}>Like</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  backBtn: { padding: 8, backgroundColor: 'white', borderRadius: 12, elevation: 1 },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 8, backgroundColor: 'white', borderRadius: 12, elevation: 1 },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 10 },
  categoryTag: { color: '#0284c7', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', lineHeight: 36, marginBottom: 16 },
  meta: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 24 },
  
  heroImg: { height: 220, backgroundColor: '#e2e8f0', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  heroImgText: { color: '#94a3b8', fontWeight: '600' },

  paragraph: { fontSize: 16, color: '#334155', lineHeight: 28, marginBottom: 24 },
  subHeading: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 16, marginBottom: 12 },

  engagementArea: { marginTop: 40, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e2e8f0', alignItems: 'center' },
  engagementText: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 16 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: '#fecaca' },
  likeText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});