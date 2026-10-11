import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_.6fr]">
          <div>
            <Link href="/#beranda" className="flex items-center gap-2.5">
              <Image
                src="/Amangiz-Logo.png"
                alt="AMANGIZ"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg"
              />
              <span className="font-extrabold tracking-[-.05em] text-primary-hover">
                AMANGIZ{" "}
                <span className="font-medium text-muted">— Amankan Gizi</span>
              </span>
            </Link>
            <p className="mt-4 text-sm font-medium text-primary">
              Jaga Gizi. Jaga Generasi.
            </p>
            <p className="mt-5 max-w-xl text-xs leading-5 text-muted">
              AMANGIZ merupakan platform pendukung pencatatan, traceability, dan
              workflow penanganan dugaan insiden. Informasi yang ditampilkan
              bergantung pada data yang tersedia dan tidak menggantikan
              pemeriksaan medis, pengujian laboratorium, atau keputusan pihak
              berwenang.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[.13em] text-muted">
              NAVIGASI
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted">
              <Link href="/#beranda">Beranda</Link>
              <Link href="/#cara-kerja">Cara Kerja</Link>
              <Link href="/#fitur">Fitur Utama</Link>
              <Link href="/about">Tentang Kami</Link>
              <Link href="/login" className="font-semibold text-primary">
                Masuk
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted">
          © 2026 AMANGIZ. Prototype for demonstration purposes.
        </div>
      </div>
    </footer>
  );
}
