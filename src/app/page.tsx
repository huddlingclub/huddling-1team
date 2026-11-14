import AdminLogin from "@/components/admin-login";
import TeamsHome from "@/components/teams-home";

export const dynamic = "force-dynamic";
export default function Home() {
  return <TeamsHome adminLogin={<AdminLogin id={process.env.ADMIN_ID || ""} />} />;
}
