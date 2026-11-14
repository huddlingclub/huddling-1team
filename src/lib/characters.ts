// 직군·관심 분야별 말랑 캐릭터 (public/chars/*.webp, 256px)
const occupationChars: Record<string, string> = { 개발: "developer", 디자인: "designer", 기획: "planner", 마케팅: "marketer", "대표·창업자": "ceo", 투자: "investor", 기타: "etc_job" };
const domainChars: Record<string, string> = { 핀테크: "fintech", 헬스케어: "healthcare", 커머스: "commerce", SaaS: "saas", AI: "ai", 콘텐츠: "content", 교육: "education", 기타: "etc_domain" };
export const occupationChar = (o: string) => occupationChars[o] ? `/chars/${occupationChars[o]}.webp` : null;
export const domainChar = (d: string) => domainChars[d] ? `/chars/${domainChars[d]}.webp` : null;
const teamChars = ["developer", "designer", "planner", "marketer", "ceo", "ai", "fintech", "healthcare", "commerce", "saas", "content", "education", "investor", "etc_domain", "etc_job"];
export const teamChar = (n: number) => `/chars/${teamChars[(n - 1 + teamChars.length) % teamChars.length]}.webp`;
