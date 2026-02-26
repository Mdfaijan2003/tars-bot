import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChatApp } from "@/components/chat-app";

export default function HomePage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  return <ChatApp />;
}
