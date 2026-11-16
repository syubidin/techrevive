import { Icon } from "./icons";

/** Pesan galat standar admin (dari ?error=...). */
export function AdminAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
      <Icon name="alert" size={18} className="mt-0.5 shrink-0" />{message.slice(0, 250)}
    </p>
  );
}
