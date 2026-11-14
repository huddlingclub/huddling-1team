"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DoneView({ id }: { id: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    void fetch("/api/rooms/" + id, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      const n = typeof data.profileCount === "number" ? data.profileCount : Array.isArray(data.profiles) ? data.profiles.length : null;
      setCount(n);
    }).catch(() => {});
  }, [id]);
  return <main className="container narrow"><div className="panel done-card">
    <div className="eyebrow">WELCOME TO HUDDLING</div>
    <h1>카드가 등록됐어요!</h1>
    {count !== null && <p className="muted">{count}명이 카드를 등록했어요</p>}
    <Link href="/event" className="button">전체 조 카드 보기 →</Link>
  </div></main>;
}
