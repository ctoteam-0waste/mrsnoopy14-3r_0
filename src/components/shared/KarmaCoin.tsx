import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Image } from 'react-native';

export function KarmaCoin({ size = 48, glow = false, animated = false }: { size?: number; glow?: boolean; animated?: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated, pulseAnim]);

  const ringScale1 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });
  const ringScale2 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });
  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.2, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Animated Rings for the 'Dynamic' Feel */}
      {animated && (
        <>
          <Animated.View
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: [{ scale: ringScale2 }],
                opacity: ringOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: [{ scale: ringScale1 }],
                opacity: ringOpacity,
              },
            ]}
          />
        </>
      )}

      {/* Soft CIRCULAR gold halo — replaces the old image shadow, which rendered
          as a square box behind the coin (shadow/elevation is cast from the PNG's
          rectangular bounds, not its round shape). */}
      {glow && (
        <>
          <View style={[styles.halo, { width: size * 1.4, height: size * 1.4, borderRadius: size, backgroundColor: '#fbbf24', opacity: 0.16 }]} />
          <View style={[styles.halo, { width: size * 1.18, height: size * 1.18, borderRadius: size, backgroundColor: '#f59e0b', opacity: 0.28 }]} />
        </>
      )}

      {/* Approved KarmaVerse gold K-coin */}
      <Image
        source={require('../../../assets/coin.webp')}
        resizeMode="contain"
        style={{ width: size, height: size, position: 'absolute' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: 'transparent',
  },
  halo: {
    position: 'absolute',
  },
});
