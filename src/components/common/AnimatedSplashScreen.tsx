import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';

interface AnimatedSplashScreenProps {
  isReady: boolean;
  onFinish: () => void;
}

const { width, height } = Dimensions.get('window');

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  isReady,
  onFinish,
}) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Animation values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  // Icon animations
  const iconScale = useRef(new Animated.Value(0.4)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  // Pulse rings
  const ring1Scale = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.7)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  // Text animations
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // Progress dot shimmer
  const dotPulse = useRef(new Animated.Value(0.3)).current;

  // 1. Entrance animation sequence
  useEffect(() => {
    // Start pulse loop for rings
    const ringLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1Scale, {
            toValue: 1.45,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ring1Scale, {
            toValue: 1.0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ring1Opacity, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(ring1Opacity, {
            toValue: 0.15,
            duration: 2300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(ring2Scale, {
            toValue: 1.8,
            duration: 2200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ring2Scale, {
            toValue: 1.1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(ring2Opacity, {
            toValue: 0.35,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(ring2Opacity, {
            toValue: 0.05,
            duration: 2200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Subtle breathing dot pulse
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    // Icon entrance animation with spring physics
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(iconRotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered text entrance
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    ringLoop.start();
    dotLoop.start();

    // Minimum display duration for a polished impression
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1600);

    return () => {
      clearTimeout(minTimer);
      ringLoop.stop();
      dotLoop.stop();
    };
  }, []);

  // 2. Exit animation when app data is ready and minimum display time elapsed
  useEffect(() => {
    if (isReady && minTimeElapsed) {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1.08,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    }
  }, [isReady, minTimeElapsed]);

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
      pointerEvents="box-none"
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0819" />

      {/* Ambient glowing radial rings behind icon */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={[
            styles.glowRing,
            styles.glowRingOuter,
            {
              transform: [{ scale: ring2Scale }],
              opacity: ring2Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.glowRing,
            styles.glowRingInner,
            {
              transform: [{ scale: ring1Scale }],
              opacity: ring1Opacity,
            },
          ]}
        />

        {/* Animated App Icon */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              opacity: iconOpacity,
              transform: [{ scale: iconScale }, { rotate: spin }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.iconImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Animated App Title & Branding */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.titleClass}>Class</Text>
            <Text style={styles.titleTrack}>Track</Text>
          </View>

          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineOpacity,
              },
            ]}
          >
            Smart Schedule & Attendance
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Modern bottom loading pill */}
      <View style={styles.footerContainer}>
        <View style={styles.loadingPill}>
          <Animated.View
            style={[
              styles.loadingDot,
              {
                opacity: dotPulse,
              },
            ]}
          />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
        <Text style={styles.versionText}>v1.0.0 • Offline Ready</Text>
      </View>
    </Animated.View>
  );
};

const ICON_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0B0819', // Premium deep night indigo
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 200,
  },
  glowRingInner: {
    width: ICON_SIZE * 1.7,
    height: ICON_SIZE * 1.7,
    backgroundColor: 'rgba(124, 77, 255, 0.25)', // Neon violet glow
    borderWidth: 1.5,
    borderColor: 'rgba(147, 51, 234, 0.4)',
  },
  glowRingOuter: {
    width: ICON_SIZE * 2.3,
    height: ICON_SIZE * 2.3,
    backgroundColor: 'rgba(56, 189, 248, 0.12)', // Cyan accent glow
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: '#15102A',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleClass: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  titleTrack: {
    fontSize: 34,
    fontWeight: '900',
    color: '#38BDF8', // Electric Cyan
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.8,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 38,
    alignItems: 'center',
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 8,
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
    marginRight: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.2,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.4,
  },
});
