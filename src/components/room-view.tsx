"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/profile";

type RoomData = { room: { id: string; name: string; phase: string }; profiles: Profile[]; myProfileId: string | null;
  isHost: boolean; questions: { id: string; text: string }[]; source: "openai" | "basic" | null };

export default function RoomView({ id }: { id: string }) {
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hostJustEntered, setHostJustEntered] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms/" + id, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "조 정보를 불러오지 못했어요."); }
  }, [id]);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    async function init() {
      const fragment = window.location.hash.slice(1);
      if (fragment) {
        history.replaceState(null, "", window.location.pathname);
        const params = new URLSearchParams(fragment);
        const token = params.get("host");
        if (token) {
          const response = await fetch("/api/rooms/" + id + "/host", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, eventToken: params.get("event") }) });
          if (!response.ok) { setError("유효하지 않은 팀장 링크예요."); return; }
          setHostJustEntered(true);
        }
      }
      await load();
      timer = setInterval(() => { if (!document.hidden) void load(); }, 3000);
    }
    void init();
    return () => { if (timer) clearInterval(timer); };
  }, [id, load]);
  async function generate() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms/" + id + "/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  if (!data) return <main className="container"><p role="status">{error || "조 정보를 불러오고 있어요..."}</p><Link href="/event">조 목록으로</Link></main>;
  const { room, profiles, questions, myProfileId, isHost } = data;
  return <main className="container">
    <div className="tag" style={{ position: "sticky", top: 0, zIndex: 1, display: "block", width: "fit-content" }}>{isHost ? "팀장 화면" : "팀원 화면"} · {room.name}</div>
    {hostJustEntered && isHost && <p role="status">{room.name} 팀장으로 접속했어요.</p>}
    <Link href="/event" className="status">← 전체 조 보기</Link>
    <div className="eyebrow" style={{ marginTop: 18 }}>우리 조</div>
    <h1>{room.name}</h1>
    <section className="panel"><div className="eyebrow">TODAY'S TOPICS</div><h2>우리의 공통 대화 주제</h2>
      {questions.length ? <ol className="topics">{questions.map((question) => <li key={question.id}>{question.text}</li>)}</ol>
        : <p className="muted">팀장이 팀원의 관심사로 대화 주제를 만들어요.</p>}
      {data.source && <p className="status">{data.source === "basic" ? "관심사 기반 기본 주제" : "GPT가 만든 주제"}</p>}
      {isHost && <><p className="muted">이 팀원 프로필로 공통 주제를 생성할까요?</p>
        <button disabled={busy || profiles.length === 0} onClick={generate}>{busy ? "주제를 만들고 있어요..." : questions.length ? "공통 주제 다시 생성하기" : "공통 주제 생성하기"}</button></>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    <section className="panel"><div className="inline" style={{ justifyContent: "space-between" }}><div><div className="eyebrow">MEET THE TEAM</div><h2>함께 모인 사람들 <span className="muted">{profiles.length}</span></h2></div>
      {!myProfileId && <Link className="button secondary" href="/event/join">내 프로필 작성</Link>}</div>
      {profiles.length === 0 ? <p className="muted">아직 등록된 프로필이 없어요.</p> : <div className="profiles">{profiles.map((profile) => <article className="profile" key={profile.id}>
        <h3>{profile.name} {profile.id === myProfileId && <span className="status">나</span>}</h3>
        <div className="status">{profile.occupation} · {profile.experience}</div><p>{profile.introduction}</p>
        <div>{profile.domains.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        {profile.socialUrl && <p><a href={profile.socialUrl} target="_blank" rel="noopener noreferrer">SNS 보기 ↗</a></p>}
      </article>)}</div>}
    </section>
  </main>;
}
