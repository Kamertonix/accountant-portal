import type { Config } from 'tailwindcss';

// Colours lifted straight from the app's own lib/theme/app_theme.dart
// (AppColors) so the portal feels like the same product, not a
// bolted-on afterthought.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#030712',
        surface: '#071120',
        card: '#111827',
        cardSoft: '#121D30',
        input: '#0F172A',
        border: '#2B3A55',
        borderSoft: 'rgba(255,255,255,0.13)',
        textPrimary: '#FFFFFF',
        textSecondary: '#B8C1D1',
        textMuted: '#7C8799',
        accent: '#2F80FF',
        accentLight: '#5BA3FF',
        accentStroke: '#2A8CFF',
        success: '#16C784',
        warning: '#FF9500',
        danger: '#FF4D4F',
      },
      borderRadius: {
        card: '22px',
      },
    },
  },
  plugins: [],
};

export default config;
