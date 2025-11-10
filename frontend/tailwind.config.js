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
        // VisionCraft AI Design System Colors
        'aurora-blue': '#00D4FF',
        'deep-space': '#0A0A0F',
        'nebula-purple': '#8B5CF6',
        'cosmic-gray': '#1A1A2E',
        'quantum-green': '#10B981',
        'plasma-red': '#EF4444',
        'starlight': '#F8FAFC',
        'moon-dust': '#94A3B8',
        'void': '#000000',

        // Light theme colors
        'light-bg': '#FFFFFF',
        'light-surface': '#F8FAFC',
        'light-card': '#FFFFFF',
        'light-border': '#E2E8F0',
        'light-text': '#1E293B',
        'light-text-secondary': '#64748B',
        'light-accent': '#3B82F6',
        'light-accent-purple': '#8B5CF6',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'aurora-pulse': 'aurora-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'quantum-flow': 'quantum-flow 3s ease-in-out infinite',
        'nebula-glow': 'nebula-glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'aurora-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'quantum-flow': {
          '0%, 100%': { transform: 'translateX(0)', opacity: '0.7' },
          '50%': { transform: 'translateX(10px)', opacity: '1' },
        },
        'nebula-glow': {
          '0%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'aurora': '0 0 20px rgba(0, 212, 255, 0.3)',
        'nebula': '0 0 30px rgba(139, 92, 246, 0.4)',
        'quantum': '0 0 15px rgba(16, 185, 129, 0.3)',
        'plasma': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('light', '.light &'); // <--- this is the fix
    },
  ],
}
