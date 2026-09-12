import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppProvider, useApp, TabName } from './src/context/AppContext';
import { TodayScreen } from './src/screens/TodayScreen';
import { TimetableScreen } from './src/screens/TimetableScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { ExamsScreen } from './src/screens/ExamsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { OnboardingModal } from './src/components/onboarding/OnboardingModal';
import { AnimatedSplashScreen } from './src/components/common/AnimatedSplashScreen';
import { Ionicons } from '@expo/vector-icons';

interface TabItem {
  name: TabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItem[] = [
  { name: 'today', label: 'Today', icon: 'sunny-outline', activeIcon: 'sunny' },
  { name: 'timetable', label: 'Schedule', icon: 'grid-outline', activeIcon: 'grid' },
  { name: 'attendance', label: 'Attendance', icon: 'pie-chart-outline', activeIcon: 'pie-chart' },
  { name: 'exams', label: 'Exams', icon: 'school-outline', activeIcon: 'school' },
  { name: 'settings', label: 'More', icon: 'ellipsis-horizontal-circle-outline', activeIcon: 'ellipsis-horizontal-circle' },
];

const MainApp: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { activeTab, setActiveTab, loading } = useApp();
  const [navBarWidth, setNavBarWidth] = useState(0);
  const [splashFinished, setSplashFinished] = useState(false);

  // Screen animation values
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;

  // Active tab indicator animation (0 to 4)
  const activeTabIndex = TABS.findIndex(t => t.name === activeTab);
  const tabIndicatorAnim = useRef(
    new Animated.Value(activeTabIndex >= 0 ? activeTabIndex : 0)
  ).current;

  useEffect(() => {
    const targetIdx = TABS.findIndex(t => t.name === activeTab);
    if (targetIdx >= 0) {
      Animated.spring(tabIndicatorAnim, {
        toValue: targetIdx,
        damping: 18,
        stiffness: 190,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    }

    // Screen transition animation
    screenFadeAnim.setValue(0.72);
    screenTranslateY.setValue(5);
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(screenTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab]);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'today':
        return <TodayScreen />;
      case 'timetable':
        return <TimetableScreen />;
      case 'attendance':
        return <AttendanceScreen />;
      case 'exams':
        return <ExamsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <TodayScreen />;
    }
  };

  const tabWidth = navBarWidth > 0 ? navBarWidth / TABS.length : 0;
  const pillWidth = 52;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: !splashFinished ? '#0B0819' : colors.background },
      ]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle={!splashFinished ? 'light-content' : isDark ? 'light-content' : 'dark-content'}
        backgroundColor={!splashFinished ? '#0B0819' : colors.background}
      />

      {!loading && (
        <>
          {/* Screen View with smooth cross-fade & spring */}
          <Animated.View
            style={[
              styles.screenContainer,
              {
                opacity: screenFadeAnim,
                transform: [{ translateY: screenTranslateY }],
              },
            ]}
          >
            {renderActiveScreen()}
          </Animated.View>

          {/* Material 3 Bottom Navigation Bar */}
          <View
            style={[
              styles.navBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.borderSubtle,
              },
            ]}
            onLayout={e => setNavBarWidth(e.nativeEvent.layout.width)}
          >
            {/* Animated Sliding Pill Indicator */}
            {tabWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.slidingIndicatorPill,
                  {
                    width: pillWidth,
                    backgroundColor: colors.primaryContainer,
                    transform: [
                      {
                        translateX: tabIndicatorAnim.interpolate({
                          inputRange: TABS.map((_, i) => i),
                          outputRange: TABS.map(
                            (_, i) => i * tabWidth + (tabWidth - pillWidth) / 2
                          ),
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}

            {TABS.map(tab => {
              const isActive = activeTab === tab.name;
              return (
                <TouchableOpacity
                  key={tab.name}
                  style={styles.navItem}
                  onPress={() => setActiveTab(tab.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconWrapper}>
                    <Ionicons
                      name={isActive ? tab.activeIcon : tab.icon}
                      size={20}
                      color={isActive ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.navLabel,
                      {
                        color: isActive ? colors.text : colors.textTertiary,
                        fontWeight: isActive ? '800' : '500',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Onboarding Wizard if first run */}
          <OnboardingModal />
        </>
      )}

      {/* Animated Splash Screen Overlay */}
      {!splashFinished && (
        <AnimatedSplashScreen
          isReady={!loading}
          onFinish={() => setSplashFinished(true)}
        />
      )}
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <MainApp />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  screenContainer: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 48,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  slidingIndicatorPill: {
    position: 'absolute',
    top: 6,
    height: 30,
    borderRadius: 15,
    zIndex: 0,
  },
});
