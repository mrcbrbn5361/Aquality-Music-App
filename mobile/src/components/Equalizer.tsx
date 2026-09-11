import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface EqualizerProps {
  playing: boolean;
  color?: string;
  size?: number;
}

export const Equalizer: React.FC<EqualizerProps> = ({
  playing,
  color = '#1ed760',
  size = 14
}) => {
  const bar1 = useRef(new Animated.Value(0.3)).current;
  const bar2 = useRef(new Animated.Value(0.8)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;

    if (playing) {
      const createLoop = (val: Animated.Value, min: number, max: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: max, duration, useNativeDriver: false }),
            Animated.timing(val, { toValue: min, duration, useNativeDriver: false })
          ])
        );
      };

      anim = Animated.parallel([
        createLoop(bar1, 0.2, 1.0, 450),
        createLoop(bar2, 0.3, 0.9, 350),
        createLoop(bar3, 0.1, 0.8, 550)
      ]);
      anim.start();
    } else {
      bar1.setValue(0.2);
      bar2.setValue(0.4);
      bar3.setValue(0.2);
    }

    return () => {
      if (anim) anim.stop();
    };
  }, [playing]);

  return (
    <View style={[styles.container, { height: size, width: size * 1.1 }]}>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: color },
          {
            height: bar1.interpolate({
              inputRange: [0, 1],
              outputRange: [2, size]
            })
          }
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: color },
          {
            height: bar2.interpolate({
              inputRange: [0, 1],
              outputRange: [2, size]
            })
          }
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: color },
          {
            height: bar3.interpolate({
              inputRange: [0, 1],
              outputRange: [2, size]
            })
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  bar: {
    width: 3,
    borderRadius: 1.5
  }
});
