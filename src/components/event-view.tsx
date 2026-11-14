"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Card = { id: string; name: string; occupation: string; experience: string; domains: string[]; introduction: string };
type Team = { id: string; name: string; number: number; count: number; cards: Card[] };
const characters: Record<string, string> = { 개발: "developer", 디자인: "designer", 기획: "planner", 마케팅: "marketer", "대표·창업자": "ceo" };
export default function EventView() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [myRoomId, setMyRoomId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    async function load() {
      const token = window.location.hash.slice(1);
      if (token) {
        history.replaceState(null, "", window.location.pathname);
        const entered = await fetch("/api/event/enter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        if (!entered.ok) throw new Error("유효하지 않은 행사 초대 링크예요.");
      }
      try {
        const response = await fetch("/api/events/current", { cache: "no-store" });
        if (response.ok) {
          const body = await response.json();
          setTeams(Array.isArray(body.teams) ? body.teams : []);
          setMyRoomId(typeof body.myRoomId === "string" ? body.myRoomId : null);
        }
      } catch { /* 백엔드 준비 전에는 빈 목록을 보여준다. */ }
      setReady(true);
    }
    void load().catch((e) => setError(e instanceof Error ? e.message : "행사를 불러오지 못했어요."));
  }, []);
  const sorted = [...teams].sort((a, b) => Number(b.id === myRoomId) - Number(a.id === myRoomId) || a.number - b.number);
  return <main className="container">
    <div className="eyebrow">HUDDLING CLUB</div>
    <h1>만나서 반가워요.</h1>
    <p className="muted">프로필을 등록하고 우리 조의 대화를 시작해요.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!ready && !error && <p role="status">행사를 불러오고 있어요...</p>}
    {ready && <><Link href="/event/join" className="button">프로필 등록하기 →</Link>
      <div className="event-teams">{sorted.map((team) => <section className={"panel event-team" + (team.id === myRoomId ? " my-team" : "")} key={team.id}>
        <div className="inline event-team-heading"><h2>{team.name} {team.id === myRoomId && <span className="tag">내 조</span>}</h2><span className="status">{team.count}명</span></div>
        {team.cards?.length ? <div className="card-scroll" tabIndex={0} aria-label={team.name + " 프로필 카드"}>{team.cards.map((card) => <article className="profile event-profile" key={card.id}>
          <div className="character-avatar" aria-hidden="true">{characters[card.occupation] ? <img src={`/characters/${characters[card.occupation]}.png`} alt="" /> : <span>{card.occupation.slice(0, 1)}</span>}</div>
          <h3>{card.name}</h3><div className="status">{card.occupation} · {card.experience}</div><p>{card.introduction}</p>
          <div>{card.domains?.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        </article>)}</div> : <p className="muted">아직 등록된 카드가 없어요.</p>}
        <Link href={"/room/" + team.id}>자세히 보기 →</Link>
      </section>)}</div>
      {!sorted.length && <p className="muted" style={{ marginTop: 24 }}>아직 보여줄 조가 없어요.</p>}
    </>}
  </main>;
}
