/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      fontWeight: {
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
      },
      letterSpacing: {
        'tightest': '-0.075em',
        'tighter': '-0.05em',
        'tight': '-0.025em',
        'normal': '0em',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
      lineHeight: {
        'none': '1',
        'tight': '1.25',
        'snug': '1.375',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '2',
      },
      colors: {
        // Deep Teal/Aqua Accent System
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Primary accent
          600: '#0d9488', // Darker for hover states
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Text Hierarchy Grays
        text: {
          primary: '#ffffff',    // Pure white for headings
          secondary: '#e2e8f0',  // Light gray for body text
          tertiary: '#cbd5e1',   // Medium gray for labels
          quaternary: '#94a3b8', // Darker gray for subtle text
          muted: '#64748b',      // Most subtle for metadata
        },
        // Background System
        bg: {
          primary: '#0f172a',    // Main dark background
          secondary: '#1e293b',  // Card backgrounds
          tertiary: '#334155',   // Elevated elements
        },
      },
    },
  },
  plugins: [],
};