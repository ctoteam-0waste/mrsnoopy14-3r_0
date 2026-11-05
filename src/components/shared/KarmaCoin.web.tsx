import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image } from 'react-native';

// The approved KarmaVerse coin — the gold K-coin lifted from the logo
// (assets/coin.webp, generated from logo-icon.png with baked-in gloss/shading).
// `animated` gives it a periodic 3D spin around the Y axis, like a real coin.
export function KarmaCoin({ size = 48, glow = false, animated = false }: { size?: number; glow?: boolean; animated?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(2600), // rest between spins so it stays classy, not dizzy
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, spin]);

  const rotateY = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Shadows live on this OUTER, non-rotating layer. Putting them on the coin
  // itself made a static circle show behind it mid-spin as the coin flattened.
  // While animating we use a soft radial glow (no hard edge) so nothing reads
  // as a second circle.
  const aura = glow
    ? { boxShadow: `0 0 ${size * 0.4}px rgba(243, 186, 47, 0.55)`, borderRadius: size / 2 }
    : animated
      ? undefined
      : { boxShadow: `0 ${Math.max(1, size * 0.06)}px ${size * 0.18}px rgba(0, 0, 0, 0.3)`, borderRadius: size / 2 };

  return (
    <Animated.View
      // @ts-ignore web-only boxShadow
      style={{ width: size, height: size, ...aura }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: animated ? [{ perspective: size * 12 }, { rotateY }] : undefined,
        }}
      >
        <Image
          source={require('../../../assets/coin.webp')}
          resizeMode="contain"
          style={{ width: size, height: size }}
        />
      </Animated.View>
    </Animated.View>
  );
}
