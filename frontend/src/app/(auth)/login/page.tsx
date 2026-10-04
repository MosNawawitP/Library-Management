import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Library Management",
  description: "เข้าสู่ระบบจัดการห้องสมุด",
};

export default function LoginPage() {
  return <LoginForm />;
}
