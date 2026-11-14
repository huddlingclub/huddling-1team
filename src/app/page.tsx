"use client";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function HomeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("invite") === "invalid" ? "유효하지 않은 초대 링크예요." :
    params.get("invite") === "unavailable" ? "방을 확인할 수 없어요. 잠시 후 다시 시도해 주세요." : "");
  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const name = new FormData(event.currentTarget).get("name");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push("/room/" + data.id + "/join");
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); setBusy(false); }
  }
  return <main className="container narrow hero"><div style={{ width: "100%" }}>
    <div className="eyebrow">HUDDLING ICEBREAKER</div>
    <h1>어색함은 잠깐,<br />대화는 자연스럽게.</h1>
    <p className="muted">서로를 소개하고, 우리 팀의 관심사로<br />함께 이야기할 질문을 골라요.</p>
    <form className="panel stack" onSubmit={createRoom}>
      <label>팀 이름<input name="name" placeholder="예: 허들링 1조" maxLength={50} required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={busy}>{busy ? "방을 만들고 있어요..." : "우리 팀 방 만들기 →"}</button>
    </form>
    <p className="status" style={{ marginTop: 15 }}>초대 링크를 받았다면 링크를 열어 참여할 수 있어요.</p>
  </div></main>;
}
export default function Home() { return <Suspense fallback={<main className="container">불러오는 중...</main>}><HomeContent /></Suspense>; }
