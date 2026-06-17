/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system DocGen (theme.jsx)
        ink: '#48426a',
        mut: '#9b93b8',
        brand: {
          purple: '#9b5de5',
          pink: '#f15bb5',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        glass: '18px',
      },
      boxShadow: {
        glass: '0 8px 30px rgba(99, 60, 160, 0.10)',
      },
      keyframes: {
        floatPaper: {
          '0%': { transform: 'translateY(0px)   rotate(var(--r, 0deg))' },
          '30%': {
            transform: 'translateY(-18px)  rotate(calc(var(--r, 0deg) + 3deg))',
          },
          '65%': {
            transform: 'translateY(-10px)  rotate(calc(var(--r, 0deg) - 2deg))',
          },
          '100%': { transform: 'translateY(0px)   rotate(var(--r, 0deg))' },
        },
        growBar: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        floatPaper: 'floatPaper 18s ease-in-out infinite',
        growBar: 'growBar 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
