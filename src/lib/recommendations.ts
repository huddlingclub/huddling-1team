import { z } from "zod";
import type { Profile } from "./profile";

const questionSchema = z.array(z.string().trim().min(1).max(200)).length(3)
  .refine((questions) => new Set(questions).size === questions.length, "질문이 중복됐어요.");

export function validateQuestions(value: unknown): string[] {
  return questionSchema.parse(value);
}

export function basicQuestions(profiles: Profile[], round = 0): string[] {
  const interests = [...new Set(profiles.flatMap((profile) => profile.domains))];
  const first = interests[0] || "관심 있는";
  const second = interests[1] || first;
  const sets = [
    [first + " 분야에 관심을 갖게 된 계기는 무엇인가요?", second + " 분야에서 최근 흥미롭게 본 경험이나 서비스가 있나요?", "요즘 일하면서 직접 해결해 보고 싶은 문제는 무엇인가요?"],
    [first + " 분야에서 직접 만들어 보고 싶은 것은 무엇인가요?", second + " 분야에서 동료에게 추천하고 싶은 경험이 있나요?", "서로 다른 직군과 협업하면서 배운 점이 있나요?"],
    [first + " 분야에서 가장 궁금한 변화는 무엇인가요?", second + " 분야의 문제를 해결한다면 어디서 시작하고 싶나요?", "최근 업무에서 새롭게 시도한 방법이 있나요?"],
  ];
  return sets[Math.abs(round) % sets.length];
}
