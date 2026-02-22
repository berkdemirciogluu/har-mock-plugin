/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/popup/**/*.{ts,html}'],
  theme: {
    extend: {
      maxWidth: {
        popup: '400px',
      },
      width: {
        popup: '400px',
      },
    },
  },
  plugins: [],
};
