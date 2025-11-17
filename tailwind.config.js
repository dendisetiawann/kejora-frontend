/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1F3D2B',
          DEFAULT: '#3FA372',
          light: '#DCFCE7',
          accent: '#6ED3A5',
        },
      },
    },
  },
  plugins: [],
};

