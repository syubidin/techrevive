import { Icon, type IconName } from "./icons";

export function AdminPageHeader({ title, icon, children }: { title: string; icon?: IconName; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight">
        {icon && <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name={icon} size={20} /></span>}
        {title}
      </h1>
      {children}
    </div>
  );
}
