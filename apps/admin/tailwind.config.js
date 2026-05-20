const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  // Opacity-suffixed colour tokens applied via Angular `[class.x]` dynamic
  // bindings aren't seen by the JIT scanner. Safelist the ones we use so
  // they survive a production build.
  safelist: [
    'bg-blue-50/40',
    'bg-red-50/40',
    'bg-brand-50/40',
    // Hover variants used in Angular [class.x] / ngClass dynamic bindings — not detected by Tailwind JIT scanner
    'hover:bg-blue-50',
    'hover:bg-slate-50',
    'hover:bg-brand-100',
    'hover:bg-brand-700',
    // Status chip colours applied via ngClass dynamic strings
    'bg-brand-50',
    'text-brand-700',
    // Signoff not-ready warning banner (amber is an allowed exception for this warning)
    'bg-amber-50/40',
    // Offer status chip classes applied via ngClass from offer-labels.ts
    'bg-slate-100', 'text-slate-500', 'border-slate-200',
    'bg-amber-50', 'text-amber-700', 'border-amber-200',
    'bg-brand-100', 'text-brand-800', 'border-brand-200',
    'bg-red-50', 'text-red-600', 'border-red-200',
    'text-slate-700',
    // Offer list row highlight for countered status
    'bg-brand-50',
    // Offer timeline dot classes
    'bg-brand-400', 'ring-brand-100',
    'bg-brand-600', 'ring-brand-200',
    'bg-brand-500', 'ring-brand-300',
    'bg-red-400', 'ring-red-100',
    'bg-red-300',
    'bg-slate-300', 'ring-slate-100',
    'bg-slate-400',
    // Section score bar colours
    'bg-brand-500', 'bg-amber-400', 'bg-red-500',
    'text-brand-700', 'text-amber-700', 'text-red-600',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Tajawal', 'Cairo', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
