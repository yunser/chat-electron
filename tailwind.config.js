/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#1a202e',
          750: '#2d3748',
          650: '#3f4d5e',
        },
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
