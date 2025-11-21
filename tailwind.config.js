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
          dark: '#111827', // Rich Black
          DEFAULT: '#374151', // Professional Slate
          light: '#F5F8FA', // Cool Off-White
          accent: '#D4AF37', // Premium Gold
        },
      },
    },
  },
  plugins: [],
};

