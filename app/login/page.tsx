import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginCredentials } from "@/components/login-credentials";
import { Reveal } from "@/components/reveal";

const roles = [
  {
    image: "/Administrator.png",
    name: "Administrator",
    description: "Mengelola pengguna, data referensi, dan konfigurasi sistem.",
  },
  {
    image: "/Operator SPPG.png",
    name: "Operator SPPG",
    description: "Mencatat batch, produksi, dan distribusi.",
  },
  {
    image: "/Operator Sekolah.png",
    name: "Operator Sekolah",
    description: "Melihat penerimaan dan melaporkan insiden.",
  },
  {
    image: "/Investigator Petugas Berwenang.png",
    name: "Investigator",
    description: "Menelusuri dan mendokumentasikan investigasi.",
  },
] as const;

export const metadata: Metadata = {
  title: "Masuk - AMANGIZ",
  description:
    "Masuk ke dashboard AMANGIZ untuk mengelola traceability dan insiden keamanan pangan.",
};

export default function LoginPage() {
  const isSandbox = process.env.IS_SANDBOX === "true";

  return (
    <main className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary-hover p-12 lg:flex">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,rgba(17,94,89,.35),transparent_45%),radial-gradient(circle_at_10%_85%,rgba(15,118,110,.3),transparent_45%)]" />

        <Reveal variant="fade">
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
        </Reveal>

        <Reveal
          variant="up"
          delay={0.15}
          className="flex flex-col items-center text-center"
        >
          <Image
            src="/Auth-Ilustration.png"
            alt=""
            width={640}
            height={640}
            priority
            className="h-auto w-full max-w-xl"
          />
          <h2 className="mt-8 max-w-md text-2xl font-semibold tracking-[-.03em] text-white">
            Satu dashboard untuk traceability dan respons insiden pangan.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-primary-light/70">
            Telusuri distribusi, catat dugaan insiden, dan kelola tindak lanjut
            dalam satu alur kerja yang terintegrasi.
          </p>
        </Reveal>

        <Reveal variant="fade" delay={0.3}>
          <p className="text-xs font-semibold tracking-wide text-primary-light/50">
            © 2026 AMANGIZ. Prototype for demonstration purposes.
          </p>
        </Reveal>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-background px-5 py-16 lg:w-1/2">
        <div className="w-full max-w-md">
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
            <span className="text-lg font-extrabold tracking-[-.05em] text-primary-hover">
              AMANGIZ
            </span>
          </Link>
          <Reveal variant="up">
            <h1 className="text-xl font-semibold text-foreground">
              Masuk ke Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Gunakan akun yang diberikan oleh administrator AMANGIZ.
            </p>
          </Reveal>
          <Reveal variant="up" delay={0.15} className="mt-8">
            <LoginCredentials isSandbox={isSandbox} />
          </Reveal>
          <Reveal variant="fade" delay={0.25}>
            <p className="mt-6 text-center text-xs text-muted">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 font-semibold text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke beranda
              </Link>
            </p>
          </Reveal>

          <div className="mt-10 border-t border-border pt-6">
            <p className="text-center text-xs font-semibold tracking-wide text-muted uppercase">
              Peran Pengguna
            </p>
            <Reveal
              variant="up"
              stagger={0.08}
              delay={0.1}
              className="mt-4 grid grid-cols-2 gap-3"
            >
              {roles.map(({ image, name, description }) => (
                <div
                  key={name}
                  className="rounded-xl border border-border bg-surface p-3"
                >
                  <Image
                    src={image}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 object-contain"
                  />
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    {name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted">
                    {description}
                  </p>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </div>
    </main>
  );
}
