import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judanjapan.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = new URL(siteUrl);
  const lastModified = new Date();

  return [
    {
      url: new URL("/", base).toString(),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/diagnosis", base).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
