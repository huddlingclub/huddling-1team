"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { domainOptions, experienceLevels, occupations } from "@/lib/profile";
import Link from "next/link";
import LeaderFlag from "@/components/leader-flag";

const characters: Record<string, string> = { 개발: "developer", 디자인: "designer", 기획: "planner", 마케팅: "marketer", "대표·창업자": "ceo" };

export default function JoinForm({ id, onComplete, host = false }: { id?: string; onComplete?: () => void; host?: boolean }) {
  const router = useRouter();
  const [intro, setIntro] = useState("");
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [valid, setValid] = useState(false);
  const [occupation, setOccupation] = useState("");
  function checkForm(form: HTMLFormElement) {
    const values = new FormData(form);
    const introduction = String(values.get("introduction") || "").trim();
    setValid(form.checkValidity() && !!String(values.get("name") || "").trim() && !!introduction
      && Array.from(introduction).length <= 50 && values.getAll("domains").length > 0);
  }
  useEffect(() => {
    if (!id) {
      fetch("/api/event").then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setTeams(data.teams); setRoom("행사"); })
        .catch((e) => setError(e.message || "행사를 불러오지 못했어요."));
      return;
    }
    async function enter() {
      const token = window.location.hash.slice(1);
      if (token) {
        history.replaceState(null, "", window.location.pathname);
        const response = await fetch("/api/rooms/" + id + "/enter", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
        });
        if (!response.ok) throw new Error("유효하지 않은 초대 링크예요.");
      }
      const [publicResponse, roomResponse] = await Promise.all([fetch("/api/rooms/" + id + "/public"), fetch("/api/rooms/" + id)]);
      if (roomResponse.ok) {
        const data = await roomResponse.json();
        if (data.myProfileId) { router.replace("/room/" + id); return; }
      }
      if (publicResponse.ok) setRoom((await publicResponse.json()).name);
    }
    void enter().catch(() => {});
  }, [id, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const targetId = id || String(form.get("teamId") || "");
    if (!targetId) { setError("참여할 조를 선택해 주세요."); setBusy(false); return; }
    try {
      const res = await fetch(host ? "/api/host-claim" : "/api/rooms/" + targetId + "/profiles", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          ...(host ? { id: targetId } : {}),
          name: form.get("name"), occupation: form.get("occupation"), experience: form.get("experience"),
          domains: form.getAll("domains"), introduction: form.get("introduction"),
          socialUrl: form.get("socialUrl") || "", consent: form.get("consent") === "on",
        }),
      });
      const data = await res.json();
      if (!host && res.status === 409) { router.push("/room/" + encodeURIComponent(typeof data.roomId === "string" ? data.roomId : targetId)); return; }
      if (!res.ok) throw new Error(data.error);
      router.push("/room/" + targetId + (host ? "?host=welcome" : "/join/done"));
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); setBusy(false); }
  }
  const content = <>
    {id && !onComplete && <Link href={`/room/${id}/start`} aria-label="역할 선택으로">←</Link>}
    <div className={`role-tag ${host ? "role-host" : "role-member"}`}>{host && <LeaderFlag />}{room && room !== "행사" ? room + " " : ""}{host ? "팀장" : "팀원"}</div>
    <h1>나를 소개해<br />주세요</h1>
    <p className="muted">{room === "행사" ? "참여할 조를 선택해 주세요." : room ? room + " 조원들에게 보일 프로필이에요." : "팀 정보를 확인하고 있어요."}</p>
    <div className="v3-role-preview"><div className="character-avatar" aria-hidden="true">{characters[occupation] ? <img src={`/characters/${characters[occupation]}.png`} alt="" /> : <span>{occupation.slice(0, 1) || "?"}</span>}</div><div><strong>{occupation ? occupation + " 캐릭터" : "나의 캐릭터"}</strong><p className="status">직군을 고르면 캐릭터가 바뀌어요</p></div></div>
    <form onSubmit={submit} onChange={(event) => checkForm(event.currentTarget)} onInput={(event) => checkForm(event.currentTarget)} className="panel stack">
      {!id && <label>참여할 조<select name="teamId" defaultValue="" required><option value="" disabled>조를 선택해 주세요</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
      <label>이름<input name="name" maxLength={40} placeholder="이름을 입력해 주세요" required /></label>
      <fieldset><legend>직군</legend><div className="chips">{occupations.map((item) => <label className="chip" key={item}><input type="radio" name="occupation" value={item} required onChange={() => setOccupation(item)} /><span>{item}</span></label>)}</div></fieldset>
      <label>연차<select name="experience" defaultValue="" required><option value="" disabled>연차를 선택해 주세요</option>{experienceLevels.map((item) => <option key={item}>{item}</option>)}</select></label>
      <fieldset><legend>관심 분야</legend><div className="chips">{domainOptions.map((item) => <label className="chip" key={item}><input type="checkbox" name="domains" value={item} /><span>{item}</span></label>)}</div></fieldset>
      <label>한 줄 소개<textarea name="introduction" value={intro} onChange={(event) => setIntro(event.target.value)} placeholder="요즘 관심 있는 일을 알려주세요" required /><span className="status">{Array.from(intro).length} / 50자</span></label>
      <label>링크드인 / SNS <span className="muted">(선택)</span><input name="socialUrl" type="url" placeholder="https://" /></label>
      <label className="inline"><input type="checkbox" name="consent" required /> 프로필을 팀에 공유하고 관심사를 질문 생성에 사용하는 데 동의해요.</label>
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={busy || !room || !valid}>{busy ? "등록 중..." : host ? "팀장으로 시작하기" : "프로필 등록하기"}</button>
    </form>
  </>;
  return onComplete ? <div>{content}</div> : <main className="container narrow">{content}</main>;
}
