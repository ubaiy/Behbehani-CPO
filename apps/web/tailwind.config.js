const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF3FB',
          100: '#DCE6FA',
          200: '#BFD3F5',
          300: '#93B4ED',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2746A6',
          700: '#1E3A8A',
          800: '#152C6B',
          900: '#0B1F4C',
        },
        ink: {
          DEFAULT: '#0F172A',
          2: '#1E293B',
          3: '#334155',
        },
        muted: {
          DEFAULT: '#64748B',
          2: '#94A3B8',
        },
        line: {
          DEFAULT: '#E2E8F0',
          2: '#CBD5E1',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          soft: '#F8FAFC',
          cool: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-sm': '0 1px 2px rgba(15,23,42,.06)',
        brand: '0 4px 16px rgba(15,23,42,.08)',
        'brand-lg': '0 14px 38px rgba(15,23,42,.14)',
        'brand-blue': '0 14px 38px rgba(30,58,138,.22)',
      },
      borderRadius: {
        pill: '999px',
      },
      maxWidth: {
        container: '1280px',
      },
      keyframes: {
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatA: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'slide-up-fade': 'slideUpFade .3s ease-out',
        'float-a': 'floatA 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
