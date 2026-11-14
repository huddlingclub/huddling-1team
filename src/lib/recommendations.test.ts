import { describe, expect, it } from "vitest";
import { profileInputSchema, type Profile } from "./profile";
import { basicQuestions, validateQuestions } from "./recommendations";
const a: Profile = { id: "1451442f-9e56-49c1-9671-d7cd6acdcf47", name: "하늘", occupation: "디자인", experience: "2~4년", domains: ["AI"], introduction: "디자인을 좋아해요", socialUrl: "" };
describe("프로필 검증", () => {
  it("50자 소개와 선택 SNS를 허용한다", () => { expect(profileInputSchema.safeParse({ ...a, introduction: "가".repeat(50), consent: true }).success).toBe(true); });
  it("51자 소개, 유효하지 않은 URL, 빈 관심 분야는 거부한다", () => {
    expect(profileInputSchema.safeParse({ ...a, introduction: "가".repeat(51), consent: true }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...a, socialUrl: "javascript:alert(1)", consent: true }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...a, domains: [], consent: true }).success).toBe(false);
  });
  it("프로필 공유와 관심사 AI 분석 동의가 없으면 거부한다", () => { expect(profileInputSchema.safeParse({ ...a, consent: false }).success).toBe(false); });
});
describe("질문 검증", () => {
  it("기본 질문은 실제 관심 분야를 사용한다", () => {
    const result = basicQuestions([a]);
    expect(result).toHaveLength(3);
    expect(result[0]).toContain("AI");
  });
  it("질문이 3개 미만이거나 중복이면 거부한다", () => {
    expect(() => validateQuestions(["하나", "둘"])).toThrow();
    expect(() => validateQuestions(["하나", "둘", "하나"])).toThrow();
  });
});
