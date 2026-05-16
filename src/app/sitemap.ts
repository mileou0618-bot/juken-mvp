import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judanjapan.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = new URL(siteUrl);

  return [
    {
      url: new URL("/", base).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/juken", base).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/juken/diagnosis", base).toString(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
