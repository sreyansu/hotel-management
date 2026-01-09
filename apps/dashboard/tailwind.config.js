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
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
