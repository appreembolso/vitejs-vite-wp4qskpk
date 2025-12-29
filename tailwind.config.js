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
}