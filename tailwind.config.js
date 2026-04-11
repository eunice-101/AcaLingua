/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4965',
          light: '#2D6A8E',
          dark: '#0F2D40',
        },
        accent: {
          DEFAULT: '#FF6B35',
          light: '#FF8A5C',
          dark: '#E55520',
        },
        recording: '#EF4444',
        listen: '#3B82F6',
        speak: '#10B981',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      animation: {
        pulse_record: 'pulse_record 1.5s ease-in-out infinite',
      },
      keyframes: {
        pulse_record: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 20px rgba(239, 68, 68, 0)' },
        },
      },
    },
  },
  plugins: [],
};
