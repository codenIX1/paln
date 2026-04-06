/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'neo-yellow': '#FFE600',
        'neo-black': '#0A0A0A',
        'neo-white': '#FAFAFA',
        'neo-pink': '#FF5C8A',
        'neo-blue': '#4B4BFF',
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px #0A0A0A',
        'neo-hover': '6px 6px 0px 0px #0A0A0A',
      },
    },
  },
  plugins: [],
}