import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Library Management",
  description: "เข้าสู่ระบบจัดการห้องสมุด",
};

export default async function LoginPage() {
  const session = await auth();

  if (session?.accessToken) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
