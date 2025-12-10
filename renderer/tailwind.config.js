/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Cor principal LARANJA (Torio Tools)
                orange: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#F97316', // Cor principal
                    600: '#EA580C',
                    700: '#C2410C',
                    800: '#9A3412',
                    900: '#7C2D12',
                    950: '#431407',
                },
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { opacity: '0.6', boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' },
                    '50%': { opacity: '1', boxShadow: '0 0 40px rgba(249, 115, 22, 0.6)' },
                },
            },
        },
    },
    plugins: [],
}
