"use client";

import Image from "next/image";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form action={action} className="card w-full max-w-sm space-y-5 p-8">
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
          <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        {state.error && <p role="alert" className="text-sm font-medium text-[var(--color-danger-600)]">{state.error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Memproses…" : "Masuk"}</button>
      </form>
    </div>
  );
}
