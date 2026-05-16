import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judanjapan.jp";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: new URL("/result", siteUrl).toString() },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

