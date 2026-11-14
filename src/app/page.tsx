import Link from "next/link";
import AdminLogin from "@/components/admin-login";

export const dynamic = "force-dynamic";

export default function Home() {
  return <main className="container narrow hero"><div style={{ width: "100%" }}>
    <div className="eyebrow">HUDDLING ICEBREAKER</div>
    <h1>어색함은 잠깐,<br />대화는 자연스럽게.</h1>
    <p className="muted">행사 초대 링크로 접속해 프로필을 등록하고<br />우리 조의 대화 주제를 확인해요.</p>
    <h2>팀원이에요</h2>
    <Link href="/event" className="button">초대 링크로 참여하기 →</Link>
    <p className="status" style={{ marginTop: 15 }}>운영진에게 받은 행사 초대 링크를 열어 주세요.</p>
    <h2 style={{ marginTop: 28 }}>팀장이에요</h2>
    <Link href="/host" className="button secondary">조 만들기 →</Link>
    <AdminLogin id={process.env.ADMIN_ID || ""} />
  </div></main>;
}
