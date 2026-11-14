import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: "허들링 | 우리를 알아가는 첫 질문", description: "서로를 알아가고 자연스럽게 대화를 시작하는 팀 아이스브레이커" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><header><Link href="/" className="nav"><span className="mark">H</span> 허들링 아이스브레이커</Link></header>{children}</body></html>;
}
