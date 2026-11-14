import { z } from "zod";
import type { Profile } from "./profile";

const questionSchema = z.array(z.string().trim().min(1).max(200)).min(3).max(5)
  .refine((questions) => new Set(questions).size === questions.length, "질문이 중복됐어요.");

export function validateQuestions(value: unknown): string[] {
  return questionSchema.parse(value);
}

export function basicQuestions(profiles: Profile[]): string[] {
  const interests = [...new Set(profiles.flatMap((profile) => profile.domains))];
  const first = interests[0] || "관심 있는";
  const second = interests[1] || first;
  return [
    first + " 분야에 관심을 갖게 된 계기는 무엇인가요?",
    second + " 분야에서 최근 흥미롭게 본 경험이나 서비스가 있나요?",
    "요즘 일하면서 직접 해결해 보고 싶은 문제는 무엇인가요?",
  ];
}
