"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 right-0 left-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-border/80 bg-surface/90 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/#beranda"
          className="flex items-center gap-2.5"
          aria-label="AMANGIZ beranda"
        >
          <Image
            src="/Amangiz-Logo.png"
            alt="AMANGIZ"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-xl"
          />
          <span className="text-lg font-extrabold tracking-[-.05em] text-primary-hover">
            AMANGIZ
          </span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font-medium text-muted lg:flex">
          <Link href="/#beranda">Beranda</Link>
          <Link href="/#cara-kerja">Cara Kerja</Link>
          <Link href="/#fitur">Fitur Utama</Link>
          <Link href="/about">Tentang Kami</Link>
        </div>
        <div className="hidden lg:block">
          <Button asChild>
            <Link href="/login">
              Masuk ke Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="lg:hidden">
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
