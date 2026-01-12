/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#09090b", // Zinc 950
                surface: "#18181b", // Zinc 900
                primary: "#3b82f6", // Blue 500
                "primary-hover": "#2563eb", // Blue 600
                secondary: "#8b5cf6", // Violet 500
                success: "#22c55e", // Green 500
                danger: "#ef4444", // Red 500
                warning: "#f59e0b", // Amber 500
                text: "#f4f4f5", // Zinc 100
                "text-muted": "#a1a1aa", // Zinc 400
                border: "#27272a", // Zinc 800
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
