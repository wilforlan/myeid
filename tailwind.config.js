/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        eid: {
          green: "#0C8346",
          gold: "#E8B923",
          blue: "#227C9D",
        },
        white: "#FFFFFF",
        black: "#000000",
        primary: "#0C8346",
        "primary-hover": "#0A6A3A",
        secondary: "#4299E1",
        "secondary-hover": "#3182CE",
        accent: "#8B5CF6",
        success: "#38A169",
        error: "#E53E3E",
        warning: "#ECC94B",
        background: "#F7FAFC",
        foreground: "#2D3748",
        border: "#E2E8F0",
        muted: "#718096",
        "muted-foreground": "#64748b",
        destructive: "#ef4444",
        "destructive-foreground": "#ffffff",
        "card-bg": "#FFFFFF",
      },
      borderRadius: {
        lg: "1rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
      animation: {
        "fadeIn": "fadeIn 0.6s ease-out forwards",
        "slideUp": "slideUp 0.5s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 