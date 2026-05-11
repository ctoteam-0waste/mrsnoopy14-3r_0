import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { Svg, Path } from 'react-native-svg';

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

      {/* Actual Coin Base */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#f59e0b',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: glow ? '#f59e0b' : '#000',
          shadowOffset: { width: 0, height: glow ? 0 : 4 },
          shadowOpacity: glow ? 0.7 : 0.3,
          shadowRadius: glow ? 20 : 10,
          elevation: glow ? 15 : 5,
          borderWidth: size * 0.04,
          borderColor: 'rgba(255,255,255,0.4)',
          position: 'absolute',
        }}
      >
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
        <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10C22 6.5 17.5 2 12 2z" fill="rgba(180,83,9,0.3)" />
          <Path d="M17 8c-3 0-5.5 1.5-7 4 .5-3 2.5-6 7-6v2zM7 16c3 0 5.5-1.5 7-4-.5 3-2.5 6-7 6v-2z" fill="white" opacity="1" />
          <Path d="M12 8v8M9 11l3-3 3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        </Svg>
      </View>
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
