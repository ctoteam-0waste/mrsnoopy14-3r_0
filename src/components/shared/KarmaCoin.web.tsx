import React from 'react';
import { View, Text } from 'react-native';

export function KarmaCoin({ size = 48, glow = false, animated = false }: { size?: number; glow?: boolean; animated?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#f59e0b',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: size * 0.04,
        borderColor: 'rgba(255,255,255,0.4)',
        // @ts-ignore web shadow
        boxShadow: glow ? `0 0 ${size * 0.5}px rgba(245,158,11,0.7)` : `0 4px 10px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Highlight sheen */}
      <View
        style={{
          position: 'absolute',
          top: '8%',
          left: '12%',
          width: '45%',
          height: '40%',
          borderRadius: size,
          backgroundColor: 'rgba(255,255,255,0.4)',
          transform: [{ rotate: '-35deg' }],
        }}
      />
      <Text style={{ fontSize: size * 0.42, lineHeight: size * 0.5 }}>♻</Text>
    </View>
  );
}
