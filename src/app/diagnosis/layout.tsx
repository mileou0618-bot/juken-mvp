import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judanjapan.jp";

// Duplicate entry route kept for compatibility; avoid duplicate indexing.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: new URL("/juken/diagnosis", siteUrl).toString() },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

