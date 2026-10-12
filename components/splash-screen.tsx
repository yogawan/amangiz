"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const fadeTimer = setTimeout(() => setFading(true), 800);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = "";
    }, 1100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-primary-hover transition-opacity duration-300 ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <Image
        src="/Amangiz-Logo.png"
        alt="AMANGIZ"
        width={256}
        height={256}
        priority
        className="h-64 w-64 animate-pulse rounded-2xl"
      />
    </div>
  );
}
