import JoinForm from "@/components/join-form";
export default async function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JoinForm id={id} />;
}
