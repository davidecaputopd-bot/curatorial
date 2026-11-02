/** @type {import('tailwindcss').Config} */

// Palco: colours are CSS variables (RGB triplets in globals.css) so opacity modifiers like /95 keep working.
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        grow: {
          bg: rgb('stage'),
          text: rgb('paper'),
          muted: rgb('muted'),
          card: rgb('surface'),
          soft: rgb('surface-2'),
          border: rgb('line'),
          ring: rgb('ring'),
          butter: rgb('butter'),
          yellow: rgb('now'),
          'yellow-strong': rgb('now-strong'),
          black: rgb('ink'),
          // state colours: one meaning each, across the app
          ok: rgb('ok'),
          done: rgb('done'),
          time: rgb('time'),
          fix: rgb('fix'),
        },
      },
      fontFamily: {
        sans: ['var(--font-schibsted)', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        e1: 'var(--e1)',
        e2: 'var(--e2)',
        e3: 'var(--e3)',
        lip: 'var(--lip), var(--e1)',
        'lip-c': 'var(--lip-c), var(--e2)',
        block: 'var(--lip-c), var(--e3)',
      },
      backgroundImage: {
        sheen: 'var(--sheen)',
        'sheen-c': 'var(--sheen-c)',
      },
      transitionTimingFunction: {
        spring: 'var(--spring)',
        out: 'cubic-bezier(.22, 1, .36, 1)',
      },
    },
  },
  plugins: [],
}
