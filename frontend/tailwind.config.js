export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tektur', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        background: '#ffffff',
        surface: '#f5f5f5',
        border: '#e0e0e0',
        'text-primary': '#000000',
        'text-secondary': '#666666',
        error: '#d32f2f',
        success: '#388e3c',
        disabled: '#cccccc',
      }
    },
  },
  plugins: [],
}
