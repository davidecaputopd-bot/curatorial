/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        grow: {
          bg: '#F7F4EE',
          text: '#111111',
          muted: '#5F5A52',
          card: '#FFFFFF',
          soft: '#F1EDE5',
          border: '#DED8CC',
          yellow: '#FFE500',
          'yellow-strong': '#FFD600',
          black: '#0F0F10',
        },
      },
    },
  },
  plugins: [],
}

