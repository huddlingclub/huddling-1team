import DoneView from "@/components/done-view";

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoneView id={id} />;
}
