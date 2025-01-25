import type { Config } from 'tailwindcss'

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      backgroundImage: {
        loading: 'linear-gradient(0.3turn, gray 10%, lightgray 10%, lightgray 20%, gray 20%, gray 30%, lightgray 30%, lightgray 40%, gray 40%, gray 50%, lightgray 50%, lightgray 60%, gray 60%, gray 70%, lightgray 70%, lightgray 80%, gray 80%, gray 90%, lightgray 90%)',
      },
      animation: {
        loading: '',
      },
    },
  },
  plugins: [],
} satisfies Config
