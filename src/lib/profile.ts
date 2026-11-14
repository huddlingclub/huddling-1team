import { z } from "zod";

export const occupations = ["개발", "디자인", "기획", "마케팅", "대표·창업자", "투자", "기타"] as const;
export const experienceLevels = ["0~1년", "2~4년", "5~9년", "10년+"] as const;
export const domainOptions = ["핀테크", "헬스케어", "커머스", "SaaS", "AI", "콘텐츠", "교육", "기타"] as const;

const socialUrl = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; }
  catch { return false; }
}, "올바른 http 또는 https 주소를 입력해 주세요.");

export const profileInputSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(40),
  occupation: z.enum(occupations),
  experience: z.enum(experienceLevels),
  domains: z.array(z.enum(domainOptions)).min(1, "관심 분야를 하나 이상 골라 주세요.").max(domainOptions.length)
    .refine((values) => new Set(values).size === values.length, "관심 분야가 중복됐어요."),
  introduction: z.string().trim().min(1, "한 줄 소개를 입력해 주세요.")
    .refine((value) => Array.from(value).length <= 50, "한 줄 소개는 50자까지 입력할 수 있어요."),
  socialUrl,
  consent: z.literal(true, { error: "프로필 공유와 AI 분석 동의가 필요해요." }),
});
export const roomInputSchema = z.object({ name: z.string().trim().min(1, "팀 이름을 입력해 주세요.").max(50) });
export type ProfileInput = z.infer<typeof profileInputSchema>;
export type Profile = Omit<ProfileInput, "consent"> & { id: string };
export type Match = { profileId: string; targetId: string; reason: string };
export type Analysis = { questions: string[]; matches: Match[]; source: "openai" | "basic" };

