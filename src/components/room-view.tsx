"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/profile";
import JoinForm from "@/components/join-form";
import LeaderFlag from "@/components/leader-flag";

type TeamProfile = Profile & { isHost?: boolean };
type RoomData = { room: { id: string; name: string; phase: string }; profiles: TeamProfile[]; myProfileId: string | null;
  isHost: boolean; myDomains?: string[]; questions: { id: string; text: string }[]; source: "openai" | "basic" | null; generatedAt?: string | null };
type LeaderData = { count: number; names: string[] };

const characters: Record<string, string> = { 개발: "developer", 디자인: "designer", 기획: "planner", 마케팅: "marketer", "대표·창업자": "ceo" };
function relativeTime(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "";
  const minutes = Math.floor(Math.max(0, Date.now() - time) / 60000);
  if (minutes < 1) return "방금 전 생성됨";
  if (minutes < 60) return `${minutes}분 전 생성됨`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전 생성됨`;
  return `${Math.floor(minutes / 1440)}일 전 생성됨`;
}

export default function RoomView({ id }: { id: string }) {
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hostJustEntered, setHostJustEntered] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [leader, setLeader] = useState<LeaderData | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms/" + id, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "조 정보를 불러오지 못했어요."); }
  }, [id]);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    async function init() {
      if (new URLSearchParams(window.location.search).get("host") === "welcome") {
        setHostJustEntered(true);
        history.replaceState(null, "", window.location.pathname + window.location.hash);
      }
      const fragment = window.location.hash.slice(1);
      if (fragment) {
        history.replaceState(null, "", window.location.pathname);
        const params = new URLSearchParams(fragment);
        const token = params.get("host");
        if (token) {
          const response = await fetch("/api/rooms/" + id + "/host", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, eventToken: params.get("event") }) });
          if (!response.ok) { setError("유효하지 않은 팀장 링크예요."); return; }
          setHostJustEntered(true);
        }
      }
      await load();
      timer = setInterval(() => { if (!document.hidden) void load(); }, 3000);
    }
    void init();
    return () => { if (timer) clearInterval(timer); };
  }, [id, load]);
  useEffect(() => {
    if (!data?.isHost) { setLeader(null); return; }
    let active = true;
    async function loadLeader() {
      try {
        const response = await fetch("/api/rooms/" + id + "/leader", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        if (active) setLeader(result);
      } catch { /* 백엔드 준비 전에는 빈 상태를 유지한다. */ }
    }
    void loadLeader();
    const timer = setInterval(() => { if (!document.hidden) void loadLeader(); }, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [id, data?.isHost]);
  async function generate() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms/" + id + "/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  if (!data) return <main className="container"><p role="status">{error || "조 정보를 불러오고 있어요..."}</p><Link href="/">조 목록으로</Link></main>;
  const { room, profiles, questions, myProfileId, isHost } = data;
  const myDomains = data.myDomains || [];
  const sharedCount = (profile: TeamProfile) => profile.domains.filter((domain) => myDomains.includes(domain)).length;
  const domains = Array.from(new Set(profiles.flatMap((profile) => profile.domains)));
  const sharedPeople = profiles.filter((profile) => profile.id !== myProfileId && sharedCount(profile) > 0).length;
  const shownProfiles = profiles.map((profile, index) => ({ profile, index }))
    .filter(({ profile }) => filters.length === 0 || filters.some((domain) => profile.domains.some((item) => item === domain)))
    .sort((a, b) => sharedCount(b.profile) - sharedCount(a.profile) || a.index - b.index);
  return <main className="container">
    <div className={`role-tag ${isHost ? "role-host" : "role-member"}`}>{isHost && <LeaderFlag />}{isHost ? "팀장 화면" : "팀원 화면"} · {room.name}</div>
    {hostJustEntered && isHost && <p role="status">{room.name} 팀장으로 접속했어요.</p>}
    <Link href="/" className="status">← 전체 조 보기</Link>
    <div className="eyebrow" style={{ marginTop: 18 }}>우리 조</div>
    <h1>{room.name}</h1>
    {(isHost || questions.length > 0) && <section className="panel"><div className="eyebrow">TODAY'S TOPICS</div><h2>우리의 공통 대화 주제</h2>
      {questions.length ? <ol className="topics">{questions.map((question, index) => <li key={question.id}><span className="topic-number" aria-hidden="true">{index + 1}</span><span>{question.text}</span></li>)}</ol>
        : <p className="muted">아직 주제가 없어요.</p>}
      {questions.length > 0 && data.generatedAt && <p className="status">{relativeTime(data.generatedAt)}</p>}
      {data.source && <p className="status">{data.source === "basic" ? "관심사 기반 기본 주제" : "GPT가 만든 주제"}</p>}
      {isHost && <><p className="muted">이 팀원 프로필로 공통 주제를 생성할까요?</p>
        <button disabled={busy || room.phase === "generating" || profiles.length === 0} onClick={generate}>{busy || room.phase === "generating" ? "생성 중..." : questions.length ? "공통 주제 다시 생성하기" : "공통 주제 생성하기"}</button></>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>}
    {isHost && <section className="panel"><h2>팀장 관리</h2>
      {leader && <p className="muted">{leader.count}명 등록{leader.names?.length ? " · " + leader.names.join(", ") : ""}</p>}
    </section>}
    <section className="panel"><div className="inline" style={{ justifyContent: "space-between" }}><div><div className="eyebrow">말랑</div><h2>등록한 사람 <span className="muted">{profiles.length}</span></h2></div>
      {!myProfileId && (isHost ? <button className="secondary" onClick={() => setShowProfileForm(!showProfileForm)}>내 프로필 등록</button> : <Link className="button secondary" href={`/room/${id}/join`}>내 프로필 작성</Link>)}</div>
      {isHost && !myProfileId && showProfileForm && <JoinForm id={id} onComplete={() => { setShowProfileForm(false); void load(); }} />}
      <p className="status">나와 관심 분야가 같은 사람 {sharedPeople}명</p>
      {domains.length > 0 && <div className="chips v3-filters" aria-label="관심 분야 필터"><button type="button" className={`filter-chip ${filters.length === 0 ? "selected" : ""}`} aria-pressed={filters.length === 0} onClick={() => setFilters([])}>전체</button>
        {domains.map((domain) => <button type="button" key={domain} className={`filter-chip ${filters.includes(domain) ? "selected" : ""}`} aria-pressed={filters.includes(domain)} onClick={() => setFilters((current) => current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain])}>{domain}</button>)}</div>}
      {profiles.length === 0 ? <p className="muted">아직 등록된 프로필이 없어요.</p> : shownProfiles.length === 0 ? <p className="muted">선택한 분야의 팀원이 없어요.</p> : <div className="profiles">{shownProfiles.map(({ profile }) => <article className="profile person-card" key={profile.id}>
        <div className="character-avatar" aria-hidden="true">{characters[profile.occupation] ? <img src={`/characters/${characters[profile.occupation]}.png`} alt="" /> : <span>{profile.occupation.slice(0, 1)}</span>}</div>
        <div className="person-details">
        <h3>{profile.name} <span className={`role-tag ${profile.isHost ? "role-host" : "role-member"}`}>{profile.isHost && <LeaderFlag />}{profile.isHost ? "팀장" : "팀원"}</span> {profile.id === myProfileId && <span className="tag">나</span>}</h3>
        <div className="status">{profile.occupation} · {profile.experience}</div><p>{profile.introduction}</p>
        <div>{profile.domains.map((tag) => <span className={`tag ${myDomains.includes(tag) && profile.id !== myProfileId ? "shared-domain" : ""}`} key={tag}>{tag}</span>)}</div>
        {profile.socialUrl && <p><a href={profile.socialUrl} target="_blank" rel="noopener noreferrer">SNS 보기 ↗</a></p>}
        </div>
      </article>)}</div>}
    </section>
  </main>;
}
