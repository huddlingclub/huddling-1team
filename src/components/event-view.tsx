"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Team = { id: string; name: string; number: number; count: number };
export default function EventView() {
  const [teams, setTeams] = useState<Team[]>([]);
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
      const response = await fetch("/api/event", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setTeams(body.teams); setError(""); setReady(true);
    }
    void load().catch((e) => setError(e instanceof Error ? e.message : "행사를 불러오지 못했어요."));
  }, []);
  return <main className="container">
    <div className="eyebrow">HUDDLING CLUB</div>
    <h1>만나서 반가워요.</h1>
    <p className="muted">프로필을 등록하고 우리 조의 대화를 시작해요.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!ready && !error && <p role="status">행사를 불러오고 있어요...</p>}
    {ready && <><Link href="/event/join" className="button">프로필 등록하기 →</Link>
      <section className="panel"><h2>1조부터 15조까지</h2><p className="muted">조를 선택하면 등록된 팀원과 대화 주제를 볼 수 있어요.</p>
        <div className="profiles team-grid">{teams.map((team) => <Link href={"/room/" + team.id} className="profile team-card" key={team.id}>
          <h3>{team.name}</h3><span className="status">참여자 {team.count}명 →</span>
        </Link>)}</div>
      </section></>}
  </main>;
}
