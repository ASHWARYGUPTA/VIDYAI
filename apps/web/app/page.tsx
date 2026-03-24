import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LandingPage from "@/components/landing/landing-page";

export default async function RootPage() {
  const session = await auth();
  if (session?.user && !session.error) redirect("/dashboard");
  return <LandingPage />;
}
