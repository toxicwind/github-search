import type { Config } from "tailwindcss";

export default {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                cyber: {
                    bg: "var(--cyber-bg)",
                    "bg-secondary": "var(--cyber-bg-secondary)",
                    "bg-tertiary": "var(--cyber-bg-tertiary)",
                    surface: "var(--cyber-surface)",
                    "surface-hover": "var(--cyber-surface-hover)",
                    border: "var(--cyber-border)",
                    "border-bright": "var(--cyber-border-bright)",
                    text: "var(--cyber-text)",
                    "text-secondary": "var(--cyber-text-secondary)",
                    "text-muted": "var(--cyber-text-muted)",
                    accent: "var(--cyber-accent)",
                    "accent-bright": "var(--cyber-accent-bright)",
                    success: "var(--cyber-success)",
                    warning: "var(--cyber-warning)",
                    danger: "var(--cyber-danger)",
                    purple: "var(--cyber-purple)",
                    pink: "var(--cyber-pink)",
                    cyan: "var(--cyber-cyan)",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["Fira Code", "Monaco", "Consolas", "monospace"],
            },
        },
    },
    plugins: [],
} satisfies Config;
