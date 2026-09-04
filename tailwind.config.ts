import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#FFC43F",
        "accent-dark": "#f7a422",
        brand: {
          dark: "#222222",
          "light-dark": "#727272",
          light: "#ffffff",
          grey: "#dbdbdb",
          "light-grey": "#fafafa",
          primary: "#6995B1",
          "light-primary": "#eef1f3",
        },
      },
      fontFamily: {
        sans: ["Open Sans", "sans-serif"],
        heading: ["Nunito", "sans-serif"],
      },
      boxShadow: {
        card: "0px 5px 22px rgba(0, 0, 0, 0.04)",
        "card-hover": "0px 21px 44px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
} satisfies Config;
