/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Define a Inter como a fonte principal 'sans'
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /(text|bg|border)-(blue|emerald|green|lime|purple|orange|amber|red|slate|indigo|black)-(600|700|800|900|500)/,
    },
  ],
}