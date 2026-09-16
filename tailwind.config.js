/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          navy: '#0B2A56',      // Primary text, header, sidebars
          blue: '#1F5EAA',      // Accent blue for actions
          green: '#2E8B57',     // Safe states
          orange: '#E57A20',    // Warnings / Medium risk
          red: '#C74440',       // Critical / SIF potential
          purple: '#6B4AA5',    // Informational purple
          bg: '#F7F9FC',        // Base background
        }
      }
    },
  },
  plugins: [],
}
