import { z } from "zod";
import type { Analysis, Profile } from "./profile";

const generatedSchema = z.object({
  questions: z.array(z.string().trim().min(1).max(200)).min(3).max(5),
  matches: z.array(z.object({ profileId: z.string().uuid(), targetId: z.string().uuid(), reason: z.string().trim().min(1).max(160) })),
});
export function validateGeneratedAnalysis(value: unknown, profiles: Profile[]): Analysis {
  const result = generatedSchema.parse(value);
  const ids = new Set(profiles.map((profile) => profile.id));
  const seen = new Set<string>();
  for (const match of result.matches) {
    if (!ids.has(match.profileId) || !ids.has(match.targetId) ||
      match.profileId === match.targetId || seen.has(match.profileId)) throw new Error("유효하지 않은 추천 대상입니다.");
    seen.add(match.profileId);
  }
  if (profiles.length > 1 && seen.size !== profiles.length) throw new Error("일부 참여자의 추천이 빠졌습니다.");
  return { ...result, source: "openai" };
}
export function basicAnalysis(profiles: Profile[]): Analysis {
  const matches = profiles.flatMap((profile) => {
    const candidates = profiles.filter((candidate) => candidate.id !== profile.id);
    if (!candidates.length) return [];
    const ranked = candidates.map((candidate) => {
      const common = profile.domains.filter((domain) => candidate.domains.includes(domain));
      return { candidate, common, score: common.length * 3 + Number(profile.occupation === candidate.occupation) };
    }).sort((a, b) => b.score - a.score);
    const { candidate, common } = ranked[0];
    const reason = common.length
      ? "두 분 모두 " + common.slice(0, 2).join(", ") + " 분야에 관심이 있어요."
      : profile.occupation === candidate.occupation ? "같은 직군에서 겪은 경험을 나눠보세요." : "서로 다른 직군의 경험을 나눠보세요.";
    return [{ profileId: profile.id, targetId: candidate.id, reason }];
  });
  return { source: "basic", matches, questions: [
    "요즘 일하면서 가장 흥미롭게 살펴보는 분야는 무엇인가요?",
    "다른 직군과 함께 일하면서 새롭게 배운 점이 있나요?",
    "최근에 직접 해결해 보고 싶었던 업무 문제는 무엇인가요?",
  ] };
}

