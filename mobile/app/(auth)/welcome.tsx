import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';
import { ONBOARDING_SLIDES, type OnboardingSlide } from '@/onboarding/slides';
import { OnboardingDots } from '@/onboarding/OnboardingDots';
import { setOnboarded } from '@/onboarding/onboarded';

/**
 * First-run onboarding carousel. Three full-width Lottie slides with animated
 * pagination dots. "Skip" and the final "Get Started" both mark onboarding done
 * and route to the login screen. Layout is fully responsive: each slide fills the
 * device width, the animation scales with the smaller screen dimension, and text
 * reflows via flexbox on any phone or tablet.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === ONBOARDING_SLIDES.length - 1;

  // Animation square scales to the smaller screen edge, clamped for tablets.
  const artSize = Math.round(Math.min(width, height) * 0.72);
  const titleSize = width >= 720 ? 30 : 26;
  const bodySize = width >= 720 ? 17 : 15;

  const goToLogin = useCallback(() => {
    void setOnboarded().finally(() => router.replace('/(auth)/login'));
  }, [router]);

  const goNext = useCallback(() => {
    if (isLast) {
      goToLogin();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }, [index, isLast, goToLogin]);

  const goToSlide = useCallback((i: number) => {
    listRef.current?.scrollToIndex({ index: i, animated: true });
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setIndex(first.index);
    },
  ).current;

  const renderItem = useCallback(
    ({ item }: { item: OnboardingSlide }) => (
      <View style={[styles.slide, { width }]}>
        <View style={[styles.artWrap, { width: artSize, height: artSize }]}>
          <LottieView source={item.source} autoPlay loop style={{ width: artSize, height: artSize }} />
        </View>
        <Text variant="headlineSmall" style={[styles.title, { fontSize: titleSize, color: colors.onSurface }]}>
          {item.title}
        </Text>
        <Text variant="bodyMedium" style={[styles.body, { fontSize: bodySize, color: colors.onSurfaceVariant }]}>
          {item.body}
        </Text>
      </View>
    ),
    [width, artSize, titleSize, bodySize],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="titleSmall" style={[styles.brand, { color: colors.onSurfaceVariant }]}>DiDwa Seller</Text>
        {!isLast && (
          <Pressable onPress={goToLogin} hitSlop={12} accessibilityRole="button">
            <Text variant="labelLarge" style={[styles.skip, { color: colors.onSurfaceVariant }]}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />

      <View style={styles.footer}>
        <OnboardingDots count={ONBOARDING_SLIDES.length} activeIndex={index} />
        <Pressable
          onPress={goNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Next'}
          style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.ctaPressed]}
        >
          <Text variant="titleMedium" style={[styles.ctaText, { color: colors.onPrimary }]}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
        {!isLast && (
          <Pressable onPress={() => goToSlide(ONBOARDING_SLIDES.length - 1)} hitSlop={8} style={styles.allset}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>I've seen this before</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  brand: { fontWeight: '600', letterSpacing: 0.4 },
  skip: { fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  artWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontWeight: '800', textAlign: 'center' },
  body: { textAlign: 'center', marginTop: 12, lineHeight: 22 },
  footer: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16 },
  cta: {
    marginTop: 28,
    width: '100%',
    maxWidth: 480,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontWeight: '700' },
  allset: { marginTop: 16, padding: 4 },
});
