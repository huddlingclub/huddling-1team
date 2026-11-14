"use client";
import { useEffect, useState } from "react";

const steps = ["팀원 프로필을 읽고 있어요", "겹치는 관심사를 찾는 중이에요", "이야기하기 좋은 주제를 고르는 중", "거의 다 됐어요!"];
const crew = ["developer", "designer", "ai"];

// 공통 주제 생성 중 로딩: 캐릭터 셋이 차례로 통통 튀고, 단계 문구가 바뀐다
export default function Generating() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 1800);
    return () => clearInterval(t);
  }, []);
  return <div className="generating-crew" role="status" aria-live="polite">
    <div className="crew">{crew.map((c, i) => <img key={c} src={`/chars/${c}.webp`} alt="" style={{ animationDelay: i * .18 + "s" }} />)}</div>
    <p key={step} className="crew-step">{steps[step]}<span className="crew-dots"><i /><i /><i /></span></p>
  </div>;
}
