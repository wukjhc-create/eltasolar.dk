/** @type {import("next").NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Info-skaermen: browseren SELV genindlaeser hvert 5. minut via
        // HTTP-headeren "Refresh" - virker helt uden JavaScript, saa
        // skaermen kan aldrig fryse fast paa gammelt indhold.
        source: "/tavle",
        headers: [
          { key: "Refresh", value: "300" },
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
