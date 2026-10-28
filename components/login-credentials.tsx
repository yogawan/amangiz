"use client";

import { useState } from "react";
import { DemoAccountsModal } from "@/components/demo-accounts-modal";
import { LoginForm } from "@/components/login-form";

export function LoginCredentials({ isSandbox }: { isSandbox: boolean }) {
  const [prefill, setPrefill] = useState<{
    email: string;
    password: string;
  } | null>(null);

  return (
    <>
      <LoginForm prefill={prefill} />
      {isSandbox && (
        <DemoAccountsModal
          onSelect={(email, password) => setPrefill({ email, password })}
        />
      )}
    </>
  );
}
