"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LeaderFlag, Mallang } from "@/components/mallang";

type Team = { id: string; name: string; number: number; count: number; hostName: string | null };
export default function StartView({ id }: { id: string }) {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [publicResponse, roomResponse] = await Promise.all([fetch(`/api/rooms/${id}/public`, { cache: "no-store" }), fetch(`/api/rooms/${id}`, { cache: "no-store" })]);
        if (roomResponse.ok) {
          const room = await roomResponse.json();
          const info = publicResponse.ok ? await publicResponse.clone().json() : null;
          if (room.isHost || (room.myProfileId && info?.hostName)) { router.replace(`/room/${id}`); return; }
        }
        if (publicResponse.ok && active) setTeam(await publicResponse.json());
      } catch { /* API 준비 전에는 빈 상태 */ }
    }
    void load(); return () => { active = false; };
  }, [id, router]);
  return <main className="container narrow v3-start"><Link className="back-link" href="/" aria-label="조 목록으로">‹</Link>
    {team && <><section className={`v3-team-summary sheet rise team-color-${(team.number - 1) % 5}`}><Mallang className="mallang-float" /><h1><span className="team-dot" aria-hidden="true" /> {team.name}</h1><p className="muted">팀원 {team.count}명 · {team.hostName ? <><LeaderFlag />팀장 {team.hostName}</> : "팀장 아직 없음"}</p></section>
      <h2 className="rise" style={{ ["--i" as string]: 1 }}>어떤 역할로 들어갈까요?</h2>
      <Link className="button v3-full rise" style={{ ["--i" as string]: 2 }} href={`/room/${id}/join`}>팀원이에요</Link>
      {team.hostName ? <button className="secondary v3-full" disabled>팀장이에요</button> : <Link className="button secondary v3-full" href={`/room/${id}/host`}>팀장이에요</Link>}
      <p className="status v3-center">{team.hostName ? `팀장 ${team.hostName}님이 있어요` : "팀장은 조마다 한 명이에요."}</p>
    </>}
  </main>;
}
