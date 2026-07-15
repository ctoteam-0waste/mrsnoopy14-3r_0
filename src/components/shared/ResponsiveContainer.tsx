import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Leaf } from 'lucide-react-native';

const MAX_WIDTH = 430;

function TopBar() {
  return (
    <View style={tb.bar}>
      <View style={tb.left}>
        <View style={tb.logoIcon}>
          <Leaf size={16} color="#052e16" />
        </View>
        <Text style={tb.title}>KarmaVer$e</Text>
      </View>
      <Text style={tb.tagline}>Recycle. Earn. Repeat.</Text>
    </View>
  );
}

export function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={s.outer}>
      <TopBar />
      <View style={s.body}>
        <View style={s.phone}>
          {children}
        </View>
      </View>
    </View>
  );
}

export function FullWidthContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return <View style={{ flex: 1 }}>{children}</View>;
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#064e3b',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
});

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#052e16',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  tagline: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
});
