import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // The desktop app calls the overlay API from its own origin. These endpoints are
    // authorised by the secret overlay token in the URL, never by cookies, so an open
    // CORS policy does not expose anything a token holder couldn't already reach.
    return [
      {
        source: "/api/overlay/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
        ],
      },
    ];
  },
};

export default nextConfig;
