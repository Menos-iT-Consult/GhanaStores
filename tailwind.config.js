/** Tailwind CSS v3 configuration - DiDwa design tokens. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        royal: { DEFAULT: '#2563EB', dark: '#1D4ED8' },
        deep: { DEFAULT: '#0F172A', light: '#1E293B' },
        mist: '#F8FAFC',
        'emerald-brand': { DEFAULT: '#059669', dark: '#047857' },
        'amber-brand': { DEFAULT: '#F59E0B', dark: '#D97706' },
        crimson: '#EF4444',
        accent: { DEFAULT: '#EA580C', dark: '#C2410C' },
        charcoal: '#18181B',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
