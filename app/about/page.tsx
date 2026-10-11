import type { Metadata } from "next";
import Image from "next/image";
import { Intro } from "@/components/section-intro";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Tentang Kami — AMANGIZ",
  description:
    "Mengenal AMANGIZ dan tim di baliknya — platform traceability dan respons penanganan insiden keamanan pangan.",
};

const team = [
  {
    name: "Adnan",
    role: "UI-UX & Video Editor",
    image: "/Adnan as a UI-UX & Video Editor.png",
  },
  {
    name: "Yogawan",
    role: "Frontend Dev",
    image: "/Yogawan as a Frontend Dev.png",
  },
  {
    name: "Lathif",
    role: "Backend & AI Dev",
    image: "/Lathif as a Backend & AI Dev.png",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      <SiteHeader />

      <section className="relative isolate border-b border-primary-light bg-primary-light/20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_35%,rgba(167,243,208,.72),transparent_23%),radial-gradient(circle_at_8%_16%,rgba(204,251,241,.6),transparent_24%)]" />
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <p className="mb-4 text-[11px] font-bold tracking-[.18em] text-primary">
            TENTANG AMANGIZ
          </p>
          <h1 className="text-4xl font-semibold tracking-[-.045em] text-primary-hover sm:text-5xl">
            Teknologi untuk mendukung koordinasi keamanan pangan.
          </h1>
          <p className="mt-6 text-base leading-7 text-muted">
            AMANGIZ dikembangkan sebagai konsep platform digital yang membantu
            menghubungkan informasi batch makanan, distribusi, dugaan insiden,
            dan tindak lanjut operasional dalam ekosistem MBG.
          </p>
          <p className="mt-4 text-sm font-medium leading-6 text-primary-hover">
            AMANGIZ dirancang untuk mendukung proses kerja manusia dan pihak
            berwenang—bukan menggantikan pemeriksaan, penilaian profesional,
            atau prosedur resmi.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <Intro
          centered
          eyebrow="TIM KAMI"
          title="Orang-orang di balik AMANGIZ."
          copy="Tim kecil yang membangun AMANGIZ sebagai konsep platform pendukung traceability dan respons insiden keamanan pangan."
        />
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {team.map((member) => (
            <article
              key={member.name}
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-background">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover object-top"
                />
              </div>
              <div className="p-5 text-center">
                <h3 className="text-lg font-semibold tracking-[-.02em]">
                  {member.name}
                </h3>
                <p className="mt-1 text-sm text-muted">{member.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
