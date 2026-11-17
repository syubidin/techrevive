"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { PasswordInput } from "@/components/password-input";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form action={action} className="card w-full max-w-sm space-y-5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="" width={44} height={44} className="rounded-lg" />
          <div>
            <p className="font-extrabold leading-none">TechRevive</p>
            <p className="muted text-xs">Admin</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="username" />
        </div>
        <div>
          <label className="label" htmlFor="password">Kata sandi</label>
          <PasswordInput id="password" autoComplete="current-password" />
        </div>
        {state.error && <p role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"><Icon name="alert" size={18} className="mt-0.5 shrink-0" />{state.error}</p>}
        <button className="btn btn-primary btn-lg w-full" disabled={pending}><Icon name={pending ? "refresh" : "lock"} size={18} className={pending ? "animate-spin" : ""} />{pending ? "Memproses…" : "Masuk"}</button>
      </form>
    </div>
  );
}
