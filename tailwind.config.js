/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pulled from the PlayOn logo
        playon: {
          teal: '#1FD3D9',
          tealDark: '#12A6AB',
          ink: '#0B0B0C',
          paper: '#FAFAFA',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
