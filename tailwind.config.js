/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          royal:      '#003DA5', // Pantone 2145 C — primary
          navy:       '#003B5C', // Pantone 4154 C — dark surface
          sky:        '#9ACEEB', // Pantone 291 C  — light accent
          periwinkle: '#8C8ECC', // Pantone 7451 C — medium accent
          red:        '#C8102E', // Pantone 186 C  — danger/critical
        },
      },
    },
  },
  plugins: [],
}
