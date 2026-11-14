"use client";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

type Team = { id: string; number: number; name: string; count: number; hostName: string | null };
export default function TeamsHome({ adminLogin }: { adminLogin: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventName, setEventName] = useState("");
  useEffect(() => {
    void fetch("/api/teams", { cache: "no-store" }).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      setTeams(Array.isArray(data.teams) ? data.teams : []);
      setEventName(typeof data.event?.name === "string" ? data.event.name : "");
    }).catch(() => {});
  }, []);
  return <main className="container narrow v3-home">
    <Image className="brand-banner" src="/brand/banner-tight.png" alt="말랑 – 처음 만난 사이도 편안하게" width={1700} height={520} priority />
    <div className="hero-characters" aria-hidden="true">{["developer", "designer", "planner", "marketer", "ceo"].map((character) => <img key={character} src={`/characters/${character}.png`} alt="" />)}</div>
    {eventName && <p className="status">{eventName}</p>}
    <h1>우리 조를<br />찾아볼까요?</h1><p className="muted">우리 조 카드를 눌러 시작하세요.</p>
    <div className="v3-team-grid">{teams.map((team) => <Link className={`v3-team-card team-color-${(team.number - 1) % 5}`} href={`/room/${team.id}/start`} key={team.id}>
      <strong>{team.name}</strong><span>팀원 {team.count}명</span><span className={team.hostName ? "team-status has-host" : "team-status"}>{team.hostName ? "팀장 있음" : "팀장 없음"}</span>
    </Link>)}</div>
    {adminLogin}
  </main>;
}
