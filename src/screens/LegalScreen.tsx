import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ShieldCheck, FileText, Trash2 } from 'lucide-react-native';
import { TERMS, PRIVACY, DATA_DELETION, LegalDoc, LegalSection } from '../data/legalContent';

function SectionBlock({ section, index }: { section: LegalSection; index: number }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeadRow}>
        <View style={styles.sectionNum}>
          <Text style={styles.sectionNumText}>{index + 1}</Text>
        </View>
        <Text style={styles.sectionHeading}>{section.heading}</Text>
      </View>
      {section.body?.map((p, i) => (
        <Text key={`p${i}`} style={styles.paragraph}>{p}</Text>
      ))}
      {section.bullets?.map((b, i) => (
        <View key={`b${i}`} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

export function LegalScreen({ route, navigation }: any) {
  const rawType = route?.params?.type;
  const type: 'terms' | 'privacy' | 'data-deletion' =
    rawType === 'privacy' || rawType === 'data-deletion' ? rawType : 'terms';
  const doc: LegalDoc = type === 'privacy' ? PRIVACY : type === 'data-deletion' ? DATA_DELETION : TERMS;
  const Icon = type === 'privacy' ? ShieldCheck : type === 'data-deletion' ? Trash2 : FileText;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.headerIconBox}>
                <Icon size={22} color="white" />
              </View>
            </View>
            <Text style={styles.headerTitle}>{doc.title}</Text>
            <View style={styles.updatedPill}>
              <Text style={styles.updatedText}>Last updated · {doc.updated}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!!doc.intro && <Text style={styles.intro}>{doc.intro}</Text>}

        {doc.sections.map((section, i) => (
          <SectionBlock key={i} section={section} index={i} />
        ))}

        {!!doc.closing && (
          <View style={styles.closingBox}>
            <Text style={styles.closingText}>{doc.closing}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, maxWidth: 800, width: '100%', alignSelf: 'center' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: 0.3, marginBottom: 10 },
  updatedPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  updatedText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 60, maxWidth: 800, width: '100%', alignSelf: 'center' },

  intro: { fontSize: 15, color: '#475569', fontWeight: '500', lineHeight: 24, marginBottom: 28 },

  section: { marginBottom: 26 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionNum: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  sectionNumText: { fontSize: 13, fontWeight: '900', color: '#15803d' },
  sectionHeading: { flex: 1, fontSize: 17, fontWeight: '800', color: '#0f172a' },

  paragraph: { fontSize: 14.5, color: '#475569', fontWeight: '500', lineHeight: 23, marginBottom: 10 },

  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 9, paddingLeft: 2 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14.5, color: '#475569', fontWeight: '500', lineHeight: 23 },

  closingBox: { marginTop: 8, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  closingText: { fontSize: 13, color: '#166534', fontWeight: '600', lineHeight: 21, textAlign: 'center' },
});
