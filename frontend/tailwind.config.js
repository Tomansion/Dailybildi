export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        'primary-dark': '#1e40af',
        secondary: '#64748b',
        danger: '#ef4444',
        success: '#10b981',
        background: '#0f172a',
        surface: '#1e293b',
        border: '#334155',
        'text-primary': '#f1f5f9',
        'text-secondary': '#cbd5e1',
      }
    },
  },
  plugins: [],
}
