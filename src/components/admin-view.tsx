"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Team = { id: string; name: string; host_name: string | null; hasQuestions: boolean; profiles: { id: string; name: string }[] };
export default function AdminView() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin", { cache: "no-store" });
    if (response.status === 401) { window.location.href = "/"; return; }
    const data = await response.json(); if (!response.ok) throw new Error(data.error); setTeams(data.teams);
  }, []);
  useEffect(() => { void load().catch((e) => setError(e.message)); }, [load]);
  async function change(action: string, roomId: string, profileId?: string) {
    if (action === "delete-profile" && !window.confirm("이 프로필을 삭제할까요?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, roomId, profileId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  return <main className="container"><Link href="/">← 처음으로</Link><h1>운영진 화면</h1>
    {error && <p className="error" role="alert">{error}</p>}
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
      <thead><tr><th>조</th><th>팀장</th><th>팀원 수</th><th>공통 주제</th><th>관리</th></tr></thead>
      <tbody>{teams.map((team) => <tr key={team.id} style={{ borderTop: "1px solid #e2e7ee", verticalAlign: "top" }}>
        <td><details><summary>{team.name}</summary>{team.profiles.length ? team.profiles.map((profile) => <div className="inline" key={profile.id} style={{ marginTop: 8 }}>{profile.name} <button className="secondary" disabled={busy} onClick={() => void change("delete-profile", team.id, profile.id)}>프로필 삭제</button></div>) : <p>팀원 없음</p>}</details></td>
        <td>{team.host_name || "없음"}</td><td>{team.profiles.length}명</td><td>{team.hasQuestions ? "생성됨" : "없음"}</td>
        <td><button className="secondary" disabled={busy || !team.host_name} onClick={() => void change("release", team.id)}>팀장 해제</button></td>
      </tr>)}</tbody>
    </table></div>
  </main>;
}
