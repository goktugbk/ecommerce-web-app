// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // prod için açık tutmak iyi olur
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**", // tüm alt yollar
      },
    ],
    // Eğer sadece domains kullanmak istersen:
    // domains: ["res.cloudinary.com"],
  },
};

module.exports = nextConfig;
