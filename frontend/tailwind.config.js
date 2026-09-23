/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cat: {
          yellow: '#F59E0B',
          amber: '#D97706',
          black: '#0B0F17',
          surface: '#111827',
          'surface-light': '#1F2937',
          'surface-card': '#151D2C',
          border: '#2A3649',
          'border-light': '#3B4A63',
          green: '#10B981',
          'green-glow': '#059669',
          red: '#EF4444',
          'red-glow': '#DC2626',
          cyan: '#06B6D4',
          blue: '#3B82F6',
          gray: '#6B7280',
          muted: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 15px -3px rgba(16, 185, 129, 0.4)',
        'glow-amber': '0 0 15px -3px rgba(245, 158, 11, 0.4)',
        'glow-red': '0 0 20px -3px rgba(239, 68, 68, 0.6)',
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.4)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
