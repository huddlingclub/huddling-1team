"use client";
import { useEffect, useState, type ReactNode } from "react";
import { CharacterStage, LeaderFlag, PageHeader } from "@/components/mallang";
import Link from "next/link";
import { teamChar } from "@/lib/characters";

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
    <PageHeader title="조를 선택하세요" sub={<>{eventName ? `${eventName} · ` : ""}카드를 누르면 그 조 페이지로 들어가요</>} />
    <div className="rise"><CharacterStage bubble="오늘은 누구랑 이야기할까?" /></div>
    <section className="team-sheet rise" style={{ ["--i" as string]: 1 }} aria-label="1~15조">
      <div className="v3-team-grid">{teams.map((team, index) => <Link className={`v3-team-card rise team-color-${(team.number - 1) % 5}`} style={{ ["--i" as string]: index + 2 }} href={`/room/${team.id}/start`} key={team.id}>
        <strong>{team.name}</strong><span>팀원 {team.count}명</span><span className={team.hostName ? "team-status has-host" : "team-status"}>{team.hostName && <LeaderFlag />}{team.hostName ? "팀장 있음" : "팀장 없음"}</span>
        <img className="team-char char-float" src={teamChar(team.number)} alt="" decoding="async" />
      </Link>)}</div>
    </section>
    <div className="home-admin">{adminLogin}</div>
  </main>;
}
