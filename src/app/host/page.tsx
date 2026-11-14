"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Team = { id: string; name: string; claimed: boolean };
export default function HostPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const res = await fetch("/api/host-claim", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setTeams(data.teams);
  }
  useEffect(() => { void load().catch((e) => setError(e.message)); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/host-claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.get("team"), name: form.get("name") }) });
      const data = await res.json();
      if (!res.ok) { if (res.status === 409) await load(); throw new Error(data.error); }
      router.push("/room/" + data.id + "?host=welcome");
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); setBusy(false); }
  }
  return <main className="container narrow">
    <Link href="/">← 처음으로</Link><h1>팀장으로 조 만들기</h1>
    <p className="muted">팀장이 없는 조를 선택하고 이름을 입력해 주세요.</p>
    <form className="panel stack" onSubmit={submit}>
      <label>조 선택<select name="team" defaultValue="" required><option value="" disabled>조를 선택해 주세요</option>{teams.map((team) => <option key={team.id} value={team.id} disabled={team.claimed}>{team.name}{team.claimed ? " · 팀장 있음" : ""}</option>)}</select></label>
      <label>이름<input name="name" maxLength={40} required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={busy || !teams.length}>{busy ? "등록 중..." : "팀장으로 시작하기"}</button>
    </form>
  </main>;
}
