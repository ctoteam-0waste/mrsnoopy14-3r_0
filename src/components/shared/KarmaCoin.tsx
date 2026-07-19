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
    outputRange: [1, 1.8],
  });
  const ringScale2 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.6],
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

      {/* Approved KarmaVerse gold K-coin */}
      <Image
        source={require('../../../assets/coin.png')}
        resizeMode="contain"
        style={{
          width: size,
          height: size,
          position: 'absolute',
          shadowColor: glow ? '#f59e0b' : '#000',
          shadowOffset: { width: 0, height: glow ? 0 : 4 },
          shadowOpacity: glow ? 0.7 : 0.3,
          shadowRadius: glow ? 20 : 10,
          elevation: glow ? 15 : 5,
        }}
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
});
