/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Core brand */
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        /* Accent — electric violet */
        accent: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        /* Dark surface */
        surface: {
          950: '#080c14',
          900: '#0d1117',
          800: '#161b27',
          700: '#1c2333',
          600: '#242d3f',
          500: '#2d3a50',
          400: '#3d4e6a',
          300: '#5a6e8a',
          200: '#8496b0',
          100: '#b8c5d6',
          50:  '#e8edf4',
        },
      },
      fontFamily: {
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Cabinet Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(14,165,233,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.06) 1px, transparent 1px)',
        'radial-glow':
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(14,165,233,0.25), transparent)',
        'hero-gradient':
          'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(14,165,233,0.18) 0%, rgba(168,85,247,0.10) 40%, transparent 70%)',
        'card-shine':
          'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 60%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'fade-up':      'fadeUp 0.6s ease forwards',
        'fade-in':      'fadeIn 0.4s ease forwards',
        'slide-in':     'slideIn 0.5s ease forwards',
        'pulse-slow':   'pulse 3s ease-in-out infinite',
        'glow':         'glow 2s ease-in-out infinite alternate',
        'float':        'float 6s ease-in-out infinite',
        'shimmer':      'shimmer 2.5s linear infinite',
        'border-spin':  'borderSpin 4s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 20px rgba(14,165,233,0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(14,165,233,0.6), 0 0 80px rgba(168,85,247,0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        borderSpin: {
          '0%':   { '--angle': '0deg' },
          '100%': { '--angle': '360deg' },
        },
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(14,165,233,0.35)',
        'glow-md':  '0 0 24px rgba(14,165,233,0.40)',
        'glow-lg':  '0 0 48px rgba(14,165,233,0.35)',
        'glow-accent': '0 0 24px rgba(168,85,247,0.40)',
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,165,233,0.2)',
        'inset-top': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}