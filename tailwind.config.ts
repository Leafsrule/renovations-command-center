import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172126",
        muted: "#60717b",
        line: "#d9e1e5",
        panel: "#f7f9fa",
        brand: "#25635f",
        caution: "#c07f24",
        danger: "#b84242"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(23, 33, 38, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
