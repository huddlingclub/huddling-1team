"use client";
import { useState, type ReactNode } from "react";

/* 말랑 캐릭터 (Figma 21-1598 Character Size=M). 조각 SVG는 Figma에서 내보낸 public/mallang/* */
export function Mallang({ size = "M", className = "" }: { size?: "S" | "M" | "L"; className?: string }) {
  const [squish, setSquish] = useState(0);
  return <span className={`mallang mallang-${size} ${className}`} aria-hidden="true">
    <span key={squish} className={`mallang-inner ${squish ? "is-squish" : ""}`} onPointerDown={() => setSquish((n) => n + 1)}>
      <span className="mallang-ground"><img src="/mallang/ground-shadow.svg" alt="" /></span>
      <span className="mallang-body" />
      <span className="mallang-highlight"><img src="/mallang/highlight.svg" alt="" /></span>
      <span className="mallang-hand mallang-hand-l"><img src="/mallang/hand.svg" alt="" /></span>
      <span className="mallang-hand mallang-hand-r"><img src="/mallang/hand.svg" alt="" /></span>
      <span className="mallang-blush mallang-blush-l"><img src="/mallang/blush.svg" alt="" /></span>
      <span className="mallang-blush mallang-blush-r"><img src="/mallang/blush.svg" alt="" /></span>
      <img className="mallang-eye mallang-eye-l" src="/mallang/eye.svg" alt="" />
      <img className="mallang-sparkle mallang-sparkle-l" src="/mallang/eye-sparkle.svg" alt="" />
      <img className="mallang-eye mallang-eye-r" src="/mallang/eye.svg" alt="" />
      <img className="mallang-sparkle mallang-sparkle-r" src="/mallang/eye-sparkle.svg" alt="" />
      <span className="mallang-mouth">ω</span>
    </span>
  </span>;
}

/* 말풍선 (Figma 21-1633) */
export function SpeechBubble({ children }: { children: ReactNode }) {
  return <span className="speech-bubble"><span className="speech-bubble-body">{children}</span><img className="speech-bubble-tail" src="/mallang/tail.svg" alt="" /></span>;
}

/* 캐릭터 무대 (Figma 21-1625 CharacterStage) */
export function CharacterStage({ bubble, size = "M", children }: { bubble?: ReactNode; size?: "M" | "L"; children?: ReactNode }) {
  return <div className={`character-stage character-stage-${size}`}>
    {bubble && <SpeechBubble>{bubble}</SpeechBubble>}
    {children ?? <Mallang size={size} className="mallang-float" />}
  </div>;
}

/* 팀장 깃발 (Figma 21-2502) */
export function LeaderFlag() {
  return <img className="leader-flag" src="/mallang/leader-flag.png" alt="" width={24} height={24} />;
}

/* 화면 머리 (Figma 21-1646 PageHeader) */
export function PageHeader({ title, sub, back }: { title: ReactNode; sub?: ReactNode; back?: ReactNode }) {
  return <header className="page-header">{back && <div className="page-header-back">{back}</div>}<h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</header>;
}
