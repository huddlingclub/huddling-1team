"use client";
import { useEffect, useState } from "react";

const colors = ["#FFB3C7", "#A9D8FF", "#FFE08A", "#B8F0C8", "#D6C2FF", "#FFC9A3"];
type Piece = { id: number; x: number; dx: number; dy: number; size: number; color: string; delay: number; round: boolean; spin: number };

// 페이지 진입 때 한 번 터지는 말랑 파티클. 화면 조작을 막지 않고, 움직임 줄이기 설정이면 그리지 않는다.
export default function Particles({ count = 28 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(Array.from({ length: count }, (_, id) => ({
      id, x: 30 + Math.random() * 40, dx: (Math.random() - .5) * 340, dy: -(120 + Math.random() * 260),
      size: 8 + Math.random() * 12, color: colors[id % colors.length], delay: Math.random() * .25,
      round: Math.random() > .35, spin: (Math.random() - .5) * 540,
    })));
    const t = setTimeout(() => setPieces([]), 2200);
    return () => clearTimeout(t);
  }, [count]);
  if (!pieces.length) return null;
  return <div className="particles" aria-hidden="true">{pieces.map((p) => <span key={p.id} style={{
    left: p.x + "%", width: p.size, height: p.size, background: p.color, borderRadius: p.round ? "50%" : "30%",
    animationDelay: p.delay + "s", ["--dx" as string]: p.dx + "px", ["--dy" as string]: p.dy + "px", ["--spin" as string]: p.spin + "deg",
  }} />)}</div>;
}
