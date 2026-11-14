"use client";
import { occupationChar } from "@/lib/characters";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/profile";
import { CharacterStage } from "@/components/mallang";
import Particles from "@/components/particles";

export default function DoneView({ id }: { id: string }) {
  const [room, setRoom] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    void fetch("/api/rooms/" + id, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      setRoom(data.room?.name || "");
      setProfile(Array.isArray(data.profiles) ? data.profiles.find((item: Profile) => item.id === data.myProfileId) || null : null);
    }).catch(() => {});
  }, [id]);
  return <main className="container narrow v3-done">
    <Particles count={36} />
    <div className="rise"><CharacterStage bubble="반가워요! 등록 완료!" /></div>
    <h1 className="rise" style={{ ["--i" as string]: 1, color: "var(--color-primary)" }}>{room ? `${room}에 합류했어요!` : "카드가 등록됐어요!"}</h1>
    <p className="muted">조 페이지에서 팀원 프로필과<br />공통 주제를 볼 수 있어요.</p>
    {profile && <article className="profile person-card rise" style={{ ["--i" as string]: 2 }}><div className="character-avatar" aria-hidden="true">{occupationChar(profile.occupation) ? <img className="char-float" src={occupationChar(profile.occupation)!} alt="" decoding="async" /> : <span>{profile.occupation.slice(0, 1)}</span>}</div>
      <div className="person-details"><h3>{profile.name} <span className="tag">나</span></h3><div className="status">{profile.occupation} · {profile.experience}</div><p>{profile.introduction}</p><div>{profile.domains.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div></article>}
    <Link href={`/room/${id}`} className="button v3-full">{room ? `${room} 페이지로 가기` : "조 페이지로 가기"}</Link>
  </main>;
}
