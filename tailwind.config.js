/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D1117',
        surface: '#161B22',
        border: '#30363D',
        accent: {
          DEFAULT: '#58A6FF',
          dark: '#1F6FEB',
          light: '#79C0FF',
        },
        text: {
          primary: '#C9D1D9',
          secondary: '#8B949E',
          muted: '#484F58',
        }
      },
    },
  },
  plugins: [],
}


