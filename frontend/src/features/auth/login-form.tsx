"use client";

import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  LayoutGrid,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] px-4 py-5 sm:px-8 sm:py-8 lg:grid lg:place-items-center">
      <div
        aria-hidden="true"
        className="absolute -left-36 -top-36 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-44 -right-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"
      />

      <section className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-[1180px] overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,43,82,0.16)] sm:min-h-[calc(100vh-4rem)] lg:min-h-[720px] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative min-h-[390px] overflow-hidden bg-[#082e6a] lg:min-h-full">
          <Image
            src="/images/login-library-illustration.png"
            alt="ห้องสมุดสมัยใหม่ที่เชื่อมหนังสือเข้ากับระบบจัดการดิจิทัล"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 54vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#073b82]/75" />

          <div className="relative z-10 flex h-full min-h-[390px] flex-col p-7 text-white sm:p-10 lg:min-h-[720px] lg:p-14">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-cyan-50 uppercase backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(253,224,71,0.9)]" />
              Library Management
            </div>

            <div className="mt-8 max-w-xl lg:mt-20">
              <p className="mb-3 text-sm font-semibold tracking-[0.22em] text-cyan-200 uppercase">
                Smart Library Workspace
              </p>
              <h1 className="text-4xl leading-[1.14] font-bold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.4rem]">
                ทุกเล่ม ทุกหมวดหมู่ จัดการได้ในที่เดียว
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-blue-50/85 sm:text-lg">
                ดูแลข้อมูลหนังสือ ค้นหาได้รวดเร็ว และจัดหมวดหมู่อย่างเป็นระบบ
                เพื่อให้งานห้องสมุดในทุกวันง่ายและแม่นยำยิ่งขึ้น
              </p>
            </div>

            <div className="mt-auto grid gap-3 pt-9 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/20 text-cyan-100">
                  <BookOpen aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <p className="font-semibold">ค้นหาหนังสือได้รวดเร็ว</p>
                <p className="mt-1 text-sm leading-5 text-blue-100/75">
                  เข้าถึงข้อมูลหนังสือที่ต้องการได้อย่างสะดวก
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-amber-300/20 text-amber-100">
                  <LayoutGrid aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <p className="font-semibold">หมวดหมู่เป็นระบบ</p>
                <p className="mt-1 text-sm leading-5 text-blue-100/75">
                  จัดระเบียบคลังหนังสือให้ดูแลต่อได้ง่าย
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-[410px]">
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-blue-50 shadow-[0_8px_24px_rgba(8,74,156,0.13)]">
                <Image
                  src="/images/library-logo.png"
                  alt="โลโก้ Library Management"
                  width={54}
                  height={54}
                  className="h-[54px] w-[54px] object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.19em] text-cyan-600 uppercase">
                  Library
                </p>
                <p className="text-lg font-bold tracking-tight text-[#0b316c]">
                  Management System
                </p>
              </div>
            </div>

            <div className="mt-10">
              <p className="text-sm font-semibold text-blue-600">ยินดีต้อนรับกลับมา</p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.15rem]">
                เข้าสู่ระบบของคุณ
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                กรอกข้อมูลบัญชีเพื่อเข้าสู่พื้นที่จัดการห้องสมุด
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  ชื่อผู้ใช้
                </label>
                <div className="group relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition-colors group-focus-within:text-blue-600">
                    <UserRound aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="กรอกชื่อผู้ใช้"
                    className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-4 pl-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  รหัสผ่าน
                </label>
                <div className="group relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition-colors group-focus-within:text-blue-600">
                    <LockKeyhole aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="กรอกรหัสผ่าน"
                    className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-12 pl-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-3 grid w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                    ) : (
                      <Eye aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2.5 text-slate-600">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  จดจำฉันในอุปกรณ์นี้
                </label>
                <span className="text-right text-xs leading-5 text-slate-400">
                  ติดต่อผู้ดูแลระบบเมื่อเข้าใช้งานไม่ได้
                </span>
              </div>

              <button
                type="submit"
                className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(5,112,207,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_16px_30px_rgba(5,112,207,0.34)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:translate-y-0"
              >
                เข้าสู่ระบบ
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </button>
            </form>

            <div className="mt-8 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
              <span className="mt-0.5 text-blue-600">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <p className="text-xs leading-5 text-slate-500">
                ระบบปกป้องการเข้าใช้งานด้วยการยืนยันตัวตนและตรวจสอบ session
                ทุกครั้ง
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
