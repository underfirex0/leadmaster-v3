import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'Inter Fallback', 'system-ui', 'sans-serif'],
        cursive: ['Caveat', 'cursive'],
        mono:    ['DM Mono', 'monospace'],
      },
      colors: {
        // Kept exactly as-is — used throughout the rest of the app
        // (dashboard, CRM, search wizard, etc). Do not change these
        // values without checking every page that uses bg-brand-*/
        // text-brand-*, since a shift here shifts the whole app's look.
        brand: {
          50: '#f2f4ff', 100: '#e6e9ff', 200: '#c7cdff', 300: '#a3adff',
          400: '#7c87fb', 500: '#5a63f0', 600: '#4548dc', 700: '#3838b3',
          800: '#2f2f8f', 900: '#292a72',
        },
        // Added for the landing page (MeetMaster accent + pricing highlights)
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Added for the landing page's design system
        surface: {
          0: '#ffffff',
          1: '#fafaf8',
          2: '#f4f4f0',
          3: '#eeede9',
        },
        ink: {
          1: '#0d0d0d',
          2: '#3d3d3d',
          3: '#6b6b6b',
          4: '#9a9a9a',
          5: '#c4c4c4',
        },
      },
      fontSize: {
        'display-xl': ['80px', { lineHeight: '1.1', letterSpacing: '-3px', fontWeight: '700' }],
        'display-lg': ['64px', { lineHeight: '1.1', letterSpacing: '-2.5px', fontWeight: '700' }],
        'display-md': ['48px', { lineHeight: '1.15', letterSpacing: '-1.5px', fontWeight: '700' }],
        'display-sm': ['36px', { lineHeight: '1.2', letterSpacing: '-1px', fontWeight: '700' }],
        'heading':    ['24px', { lineHeight: '1.3', letterSpacing: '-0.5px', fontWeight: '600' }],
        'body-lg':    ['18px', { lineHeight: '1.7', letterSpacing: '0px' }],
        'body':       ['15px', { lineHeight: '1.65', letterSpacing: '0.1px' }],
        'body-sm':    ['13px', { lineHeight: '1.6', letterSpacing: '0.1px' }],
        'caption':    ['12px', { lineHeight: '1.5', letterSpacing: '0.2px' }],
      },
      boxShadow: {
        'card':     '0 2px 20px rgba(0,0,0,0.04)',
        'card-md':  '0 4px 24px rgba(0,0,0,0.06)',
        'card-lg':  '0 8px 40px rgba(0,0,0,0.08)',
        'floating': '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        'pill-nav': '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        'pill': '999px',
        '4xl': '40px',
      },
      keyframes: {
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'reveal-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        'shimmer-spin': {
          from: { '--shimmer-angle': '0deg' },
          to:   { '--shimmer-angle': '360deg' },
        },
        'pulse-dot': {
          '0%,100%': { transform: 'scale(1)', opacity: '1' },
          '50%':     { transform: 'scale(0.6)', opacity: '0.5' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ticker': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'reveal-up':    'reveal-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'reveal-in':    'reveal-in 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in':     'scale-in 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'float':        'float 6s ease-in-out infinite',
        'pulse-dot':    'pulse-dot 1.5s ease-in-out infinite',
        'toast-in':     'toast-in 0.25s cubic-bezier(0.22,1,0.36,1) both',
        'ticker':       'ticker 30s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
