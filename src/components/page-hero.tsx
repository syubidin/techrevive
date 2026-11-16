import { Icon, type IconName } from "./icons";

/** Judul halaman informasi (Cara Pesan, FAQ, Kontak, Lacak) agar konsisten. */
export function PageHero({ title, intro, icon }: { title: string; intro?: string; icon?: IconName }) {
  return (
    <header className="relative overflow-hidden border-b border-[var(--line)]">
      <div className="hero-glow absolute inset-0" aria-hidden />
      <div data-intro className="container-x relative py-10 sm:py-14">
        {icon && <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name={icon} size={24} /></span>}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {intro && <p className="muted mt-3 max-w-2xl">{intro}</p>}
      </div>
    </header>
  );
}
