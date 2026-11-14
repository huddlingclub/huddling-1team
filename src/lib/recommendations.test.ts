import { describe, expect, it } from "vitest";
import { profileInputSchema, type Profile } from "./profile";
import { basicAnalysis, validateGeneratedAnalysis } from "./recommendations";
const a: Profile = { id: "1451442f-9e56-49c1-9671-d7cd6acdcf47", name: "하늘", occupation: "디자인", experience: "2~4년", domains: ["AI"], introduction: "디자인을 좋아해요", socialUrl: "" };
const b: Profile = { id: "ec51283f-31ad-4564-9cd7-04d45090889b", name: "바다", occupation: "개발", experience: "5~9년", domains: ["AI"], introduction: "서비스를 만들어요", socialUrl: "" };
describe("프로필 검증", () => {
  it("50자 소개와 선택 SNS를 허용한다", () => { expect(profileInputSchema.safeParse({ ...a, introduction: "가".repeat(50), consent: true }).success).toBe(true); });
  it("51자 소개, 유효하지 않은 URL, 빈 관심 분야는 거부한다", () => {
    expect(profileInputSchema.safeParse({ ...a, introduction: "가".repeat(51), consent: true }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...a, socialUrl: "javascript:alert(1)", consent: true }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...a, domains: [], consent: true }).success).toBe(false);
  });
  it("AI 분석과 팀 공유 동의가 없으면 거부한다", () => { expect(profileInputSchema.safeParse({ ...a, consent: false }).success).toBe(false); });
});
describe("추천 검증", () => {
  it("기본 추천은 실제 공통 관심 분야만 이유로 사용한다", () => {
    const result = basicAnalysis([a, b]);
    expect(result.source).toBe("basic");
    expect(result.matches[0]).toMatchObject({ profileId: a.id, targetId: b.id });
    expect(result.matches[0].reason).toContain("AI");
    expect(result.questions).toHaveLength(3);
  });
  it("모델이 자기 자신이나 없는 사람을 추천하면 거부한다", () => {
    const invalid = { questions: ["질문 하나", "질문 둘", "질문 셋"], matches: [
      { profileId: a.id, targetId: a.id, reason: "자기 자신" },
      { profileId: b.id, targetId: a.id, reason: "공통 관심사" },
    ] };
    expect(() => validateGeneratedAnalysis(invalid, [a, b])).toThrow();
    invalid.matches[0].targetId = "ec51283f-31ad-4564-9cd7-04d450908999";
    expect(() => validateGeneratedAnalysis(invalid, [a, b])).toThrow();
  });
});

