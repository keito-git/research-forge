/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          50: '#f0f6f1',
          100: '#dceade',
          200: '#b8d6bd',
          300: '#8fbd97',
          400: '#6b9e74',
          500: '#4a7c59',
          600: '#3d6b4f',
          700: '#325640',
          800: '#2a4535',
          900: '#23392c',
          950: '#112018',
        },
        sand: {
          50: '#faf7f2',
          100: '#f5f0e8',
          200: '#e8ddd0',
          300: '#d6c7b2',
          400: '#c2ac8e',
          500: '#b39676',
          600: '#9e8060',
          700: '#8b7355',
          800: '#6b5a45',
          900: '#5c4a3a',
        },
        ink: {
          50: '#f7f5f3',
          100: '#ede9e4',
          200: '#ddd6ce',
          300: '#c2b8ac',
          400: '#a89c8e',
          500: '#9e9590',
          600: '#7a7068',
          700: '#6b6560',
          800: '#4d4540',
          900: '#3a3530',
          950: '#1f1c18',
        },
      },
      fontFamily: {
        display: ['"Noto Serif JP"', 'Georgia', 'serif'],
        body: ['"Noto Sans JP"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      borderRadius: {
        'organic': '12px 20px 12px 20px',
      },
    },
  },
  plugins: [],
};
