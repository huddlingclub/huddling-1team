import Link from "next/link";

export default function Home() {
  return <main className="container narrow hero"><div style={{ width: "100%" }}>
    <div className="eyebrow">HUDDLING ICEBREAKER</div>
    <h1>어색함은 잠깐,<br />대화는 자연스럽게.</h1>
    <p className="muted">행사 초대 링크로 접속해 프로필을 등록하고<br />우리 조의 대화 주제를 확인해요.</p>
    <Link href="/event" className="button">참여한 행사 보기 →</Link>
    <p className="status" style={{ marginTop: 15 }}>처음이라면 운영진에게 받은 행사 초대 링크를 열어 주세요.</p>
  </div></main>;
}
