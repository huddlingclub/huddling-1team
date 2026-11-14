import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
  title: "말랑",
  description: "처음 만난 사이도 편안하게",
  icons: { icon: [{ url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/brand/apple-icon.png" },
  openGraph: { title: "말랑", description: "처음 만난 사이도 편안하게", images: ["/brand/banner-tight.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
