"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/profile";

type Question = { id: string; text: string; votes: number };
type RoomData = { room: { id: string; name: string; phase: "collecting" | "generating" | "voting" | "finished" };
  profiles: Profile[]; myProfileId: string | null; isHost: boolean; inviteUrl: string | null;
  questions: Question[]; myVote: string | null; voteCount: number; source: "openai" | "basic" | null };

export default function RoomView({ id }: { id: string }) {
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms/" + id, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
    } catch (e) { setError(e instanceof Error ? e.message : "방을 불러오지 못했어요."); }
  }, [id]);
  useEffect(() => { void load(); const timer = setInterval(() => { if (!document.hidden) void load(); }, 3000); return () => clearInterval(timer); }, [load]);
  async function action(endpoint: string, body: object = {}) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms/" + id + "/" + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    if (!data?.inviteUrl) return;
    try { await navigator.clipboard.writeText(data.inviteUrl); setCopied(true); }
    catch { setError("링크를 직접 선택해 복사해 주세요."); }
  }
  if (!data) return <main className="container"><p role="status">{error || "팀을 불러오고 있어요..."}</p></main>;
  const { room, profiles, questions, myProfileId, isHost, myVote, voteCount } = data;
  const top = Math.max(0, ...questions.map((q) => q.votes));
  return <main className="container">
    <div className="eyebrow">우리 팀 대화방</div>
    <h1>{room.name}</h1>
    <p className="muted">서로를 알아가는 작은 질문부터 시작해요.</p>
    {isHost && data.inviteUrl && <section className="panel"><h2>팀원 초대하기</h2>
      <div className="inline copy-row"><span className="url">{data.inviteUrl}</span><button type="button" className="secondary" onClick={copyLink}>{copied ? "복사했어요" : "링크 복사"}</button></div>
    </section>}
    <section className="panel"><div className="inline" style={{ justifyContent: "space-between" }}><div><div className="eyebrow">MEET THE TEAM</div><h2>함께 모인 사람들 <span className="muted">{profiles.length}</span></h2></div>
      {!myProfileId && room.phase === "collecting" && <Link className="button secondary" href={"/room/" + id + "/join"}>내 프로필 작성</Link>}</div>
      {profiles.length === 0 ? <p className="muted">아직 등록된 프로필이 없어요.</p> : <div className="profiles">{profiles.map((profile) => <article className="profile" key={profile.id}>
        <h3>{profile.name} {profile.id === myProfileId && <span className="status">나</span>}</h3>
        <div className="status">{profile.occupation} · {profile.experience}</div><p>{profile.introduction}</p>
        <div>{profile.domains.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        {profile.socialUrl && <p><a href={profile.socialUrl} target="_blank" rel="noopener noreferrer">SNS 보기 ↗</a></p>}
      </article>)}</div>}
    </section>
    <section className="panel"><div className="eyebrow">TODAY'S QUESTION</div><h2>오늘의 대화 주제</h2>
      {room.phase === "collecting" && <><p className="muted">모두 프로필을 등록하면 방장이 질문을 만들어요.</p>
        {isHost && <button disabled={busy || profiles.length === 0} onClick={() => action("analysis")}>{busy ? "질문을 준비하고 있어요..." : "질문 생성하기"}</button>}</>}
      {room.phase === "generating" && <p role="status">질문을 준비하고 있어요. 잠시만 기다려 주세요.</p>}
      {(room.phase === "voting" || room.phase === "finished") && <>
        <p className="muted">{data.source === "basic" ? "관심사를 바탕으로 준비한 기본 질문이에요." : "팀의 관심사를 바탕으로 GPT가 만든 질문이에요."}</p>
        <p className="status">{room.phase === "finished" ? "모두 투표했어요!" : `투표 ${voteCount} / ${profiles.length}명 · 한 사람당 한 표`}</p>
        {questions.map((question) => <button className={"question" + ((room.phase === "finished" && question.votes === top) || myVote === question.id ? " selected" : "")}
          key={question.id} disabled={busy || room.phase === "finished" || Boolean(myVote) || !myProfileId}
          onClick={() => action("vote", { questionId: question.id })}>
          <span>{room.phase === "finished" && question.votes === top ? "🏆 " : ""}{question.text}</span>
          {room.phase === "finished" && <span>{question.votes}표</span>}
        </button>)}
        {room.phase === "voting" && <p className="status">{myVote ? "투표했어요. 다른 팀원을 기다려 주세요." : myProfileId ? "가장 이야기하고 싶은 질문을 골라 주세요." : "프로필 등록 후 투표할 수 있어요."}</p>}
        {room.phase === "finished" && <p className="status">가장 많은 표를 받은 질문으로 함께 이야기해 보세요. 동점이면 공동 1위예요.</p>}
      </>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  </main>;
}
