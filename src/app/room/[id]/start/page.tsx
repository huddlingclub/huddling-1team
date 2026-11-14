import StartView from "@/components/start-view";
export default async function StartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StartView id={id} />;
}
