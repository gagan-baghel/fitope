import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FitOpe — train, eat, recover",
    short_name: "FitOpe",
    description: "Train, eat, recover — with your family.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#eef1f5",
    theme_color: "#eef1f5",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon.
    shortcuts: [
      { name: "Log food", short_name: "Food", url: "/eat/add?meal=auto", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
      { name: "Water", short_name: "Water", url: "/eat", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
      { name: "Family", short_name: "Family", url: "/family", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
    ],
  };
}
