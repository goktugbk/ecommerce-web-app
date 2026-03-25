/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#000000", // siyah
        "primary-foreground": "#ffffff",

        secondary: "#f3f4f6", // gri ton (hover için)
        "secondary-foreground": "#111827",

        destructive: "#ef4444", // kırmızı
        "destructive-foreground": "#ffffff",

        accent: "#f9fafb", // açık gri
        "accent-foreground": "#111827",

        ring: "#000000", // siyah odak halkası
        input: "#e5e7eb", // gri input border
      },
    },
  },
  plugins: [],
};
