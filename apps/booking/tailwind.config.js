/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fef3e2',
                    100: '#fde4c0',
                    200: '#fbd399',
                    300: '#f8c072',
                    400: '#f5ad4f',
                    500: '#f29a2e',
                    600: '#d98429',
                    700: '#b56d24',
                    800: '#91561f',
                    900: '#6d3f1a',
                },
                secondary: {
                    50: '#f0f7ff',
                    100: '#e0f0ff',
                    200: '#b9e0ff',
                    300: '#7cc8ff',
                    400: '#36adff',
                    500: '#0094ff',
                    600: '#0074d9',
                    700: '#0059b0',
                    800: '#004a91',
                    900: '#003d78',
                },
                accent: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
