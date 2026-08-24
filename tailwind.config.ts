import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f4ff', 100: '#e6e9ff', 200: '#c7cdff', 300: '#a3adff',
          400: '#7c87fb', 500: '#5a63f0', 600: '#4548dc', 700: '#3838b3',
          800: '#2f2f8f', 900: '#292a72',
        },
      },
      borderRadius: { 'pill': '999px' },
    },
  },
  plugins: [],
}
export default config
