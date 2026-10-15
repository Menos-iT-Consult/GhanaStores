import type React from 'react';
import type LottieView from 'lottie-react-native';
import splashAnimation from '../../assets/lottie/splash-animation.json';
import slidePayments from '../../assets/lottie/slide-payments.json';
import slideGrowth from '../../assets/lottie/slide-growth.json';

/** The shape LottieView accepts for `source` (bundled JSON or a { uri } / asset id). */
export type LottieSource = React.ComponentProps<typeof LottieView>['source'];

export interface OnboardingSlide {
  key: string;
  title: string;
  body: string;
  source: LottieSource;
}

/**
 * The three onboarding slides. Swap the `source` animations by replacing the JSON
 * files in `mobile/assets/lottie/` (or pointing these at different files).
 */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: 'store',
    title: 'Your store, in your pocket',
    body: 'Manage products, orders and inventory from anywhere — built for Ghanaian sellers.',
    source: splashAnimation as LottieSource,
  },
  {
    key: 'payments',
    title: 'Sell with MoMo & cash',
    body: 'Take Mobile Money and cash at the counter with an offline-first POS that never loses a sale.',
    source: slidePayments as LottieSource,
  },
  {
    key: 'growth',
    title: 'Grow with insights',
    body: 'Track your best sellers, reward loyal customers and keep your business moving forward.',
    source: slideGrowth as LottieSource,
  },
];
