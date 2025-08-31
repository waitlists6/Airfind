import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface ScanningIndicatorProps {
  animation: Animated.Value;
}

export function ScanningIndicator({ animation }: ScanningIndicatorProps) {
  const pulseScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const pulseOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  return (
    <View style={styles.container}>
      {/* Outer pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />
      
      {/* Middle pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          styles.pulseRingMiddle,
          {
            transform: [{ scale: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.3],
            }) }],
            opacity: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 0],
            }),
          },
        ]}
      />
      
      {/* Center dot */}
      <View style={styles.centerDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    height: 100,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  pulseRingMiddle: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
});