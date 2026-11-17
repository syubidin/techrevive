"use client";

import { useState } from "react";
import { Icon } from "./icons";

/** Input kata sandi dengan tombol lihat/sembunyikan agar tidak salah ketik. */
export function PasswordInput({ id, name = "password", autoComplete, minLength, required = true, placeholder, label }: { id: string; name?: string; autoComplete: string; minLength?: number; required?: boolean; placeholder?: string; label?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={show ? "text" : "password"} className="input !pr-12" autoComplete={autoComplete} minLength={minLength} required={required} placeholder={placeholder} aria-label={label} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan kata sandi" : "Lihat kata sandi"} aria-pressed={show} className="muted absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg hover:text-[var(--fg)]">
        <Icon name={show ? "eye-off" : "eye"} size={18} />
      </button>
    </div>
  );
}
