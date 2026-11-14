"use client";
import { Fragment, useCallback, useEffect, useState } from "react";

type AdminProfile = { id: string; name: string; occupation?: string | null; created_at?: string | null; createdAt?: string | null };
type Team = { id: string; name: string; host_name: string | null; hasQuestions: boolean; profiles: AdminProfile[] };
function registeredAt(profile: AdminProfile) {
  const value = profile.created_at || profile.createdAt;
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
export default function AdminView() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin", { cache: "no-store" });
    if (response.status === 401) { window.location.href = "/"; return; }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setTeams(data.teams);
  }, []);
  useEffect(() => { void load().catch((e) => setMessage(e.message)); }, [load]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);
  async function change(action: "release" | "delete-profile", roomId: string, profileId?: string) {
    if (!window.confirm(action === "release" ? "이 조의 팀장을 해제할까요?" : "이 프로필을 삭제할까요?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, roomId, profileId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await load();
      setMessage(action === "release" ? "팀장을 해제했어요." : "프로필을 삭제했어요.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("로그아웃하지 못했어요.");
      window.location.href = "/";
    } catch (e) { setMessage(e instanceof Error ? e.message : "다시 시도해 주세요."); setBusy(false); }
  }
  return <main className="container admin-page">
    <div className="admin-header"><h1>운영진 · 허들링 행사</h1><button className="secondary admin-button" disabled={busy} onClick={logout}>로그아웃</button></div>
    {message && <p className="admin-toast" role="status">{message}</p>}
    <div className="admin-table-scroll"><table className="admin-table">
      <thead><tr><th scope="col">조</th><th scope="col">팀장</th><th scope="col">팀원 수</th><th scope="col">주제 생성</th><th scope="col">관리</th></tr></thead>
      <tbody>{teams.map((team) => <Fragment key={team.id}>
        <tr><td><button className="admin-expand" aria-expanded={expanded === team.id} onClick={() => setExpanded(expanded === team.id ? null : team.id)}>{team.name} {expanded === team.id ? "▴" : "▾"}</button></td>
          <td>{team.host_name || <span className="muted">미배정</span>}</td><td>{team.profiles.length}명</td>
          <td>{team.hasQuestions ? <span aria-label="생성됨">✓</span> : <span className="muted">—</span>}</td>
          <td><button className="secondary admin-button" disabled={busy || !team.host_name} onClick={() => void change("release", team.id)}>팀장 해제</button></td></tr>
        {expanded === team.id && <tr className="admin-detail"><td colSpan={5}>
          {team.profiles.length ? <table className="admin-profiles"><thead><tr><th scope="col">이름</th><th scope="col">직군</th><th scope="col">등록 시각</th><th scope="col">관리</th></tr></thead>
            <tbody>{team.profiles.map((profile) => <tr key={profile.id}><td>{profile.name}</td><td>{profile.occupation || "—"}</td><td>{registeredAt(profile)}</td><td><button className="secondary admin-button" disabled={busy} onClick={() => void change("delete-profile", team.id, profile.id)}>삭제</button></td></tr>)}</tbody></table>
            : <p className="muted">등록된 팀원이 없어요.</p>}
        </td></tr>}
      </Fragment>)}</tbody>
    </table></div>
  </main>;
}
