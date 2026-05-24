/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Golos Text', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: '#0f0f12',
        card: '#161619',
        border: 'rgba(255,255,255,0.07)',
        accent: '#22c55e',
        'accent-dim': 'rgba(34,197,94,0.12)',
        muted: '#6b7280',
        dim: '#9ca3af',
      },
      boxShadow: {
        glow: '0 0 20px rgba(34,197,94,0.15)',
        'glow-sm': '0 0 10px rgba(34,197,94,0.1)',
      },
    },
  },
  plugins: [],
};
