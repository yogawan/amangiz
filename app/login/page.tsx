import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Masuk — AMANGIZ",
  description:
    "Masuk ke dashboard AMANGIZ untuk mengelola traceability dan insiden keamanan pangan.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-green-950 p-12 lg:flex">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,rgba(21,128,61,.35),transparent_45%),radial-gradient(circle_at_10%_85%,rgba(15,118,110,.3),transparent_45%)]" />

        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/Amangiz-Logo.png"
            alt="AMANGIZ"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl"
          />
          <span className="text-lg font-extrabold tracking-[-.05em] text-white">
            AMANGIZ
          </span>
        </Link>

        <div className="flex flex-col items-center text-center">
          <Image
            src="/Auth-Ilustration.png"
            alt=""
            width={400}
            height={400}
            priority
            className="h-auto w-full max-w-xs"
          />
          <p className="mt-8 text-[11px] font-bold tracking-[.18em] text-green-300">
            PLATFORM TRACEABILITY & RESPONS PENANGANAN INSIDEN PANGAN
          </p>
          <h2 className="mt-4 max-w-md text-2xl font-semibold tracking-[-.03em] text-white">
            Satu dashboard untuk traceability dan respons insiden pangan.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-green-100/70">
            Telusuri distribusi, catat dugaan insiden, dan kelola tindak lanjut
            dalam satu alur kerja yang terintegrasi.
          </p>
        </div>

        <p className="text-xs font-semibold tracking-wide text-green-100/50">
          © 2026 AMANGIZ. Prototype for demonstration purposes.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-[#f8fafc] px-5 py-16 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2.5 lg:hidden"
          >
            <Image
              src="/Amangiz-Logo.png"
              alt="AMANGIZ"
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl"
            />
            <span className="text-lg font-extrabold tracking-[-.05em] text-green-950">
              AMANGIZ
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-slate-950">
            Masuk ke Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Gunakan akun yang diberikan oleh administrator AMANGIZ.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            <Link href="/" className="font-semibold text-green-800">
              ← Kembali ke beranda
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
