import Link from "next/link";
import type { Locale } from "@/config/site";
import { pick, type Messages } from "@/lib/i18n";

interface Option { value: string; label: string }
export interface SpecFilter { key: string; label: string; type: "NUMBER" | "ENUM" | "BOOLEAN"; unit?: string | null; options: string[] }

interface Props {
  locale: Locale;
  t: Messages;
  sp: URLSearchParams;
  categories: ReadonlyArray<{ slug: string; nameId: string; nameEn: string }>;
  brands: ReadonlyArray<{ slug: string; name: string }>;
  features: string[];
  specs: SpecFilter[];
}

const has = (sp: URLSearchParams, key: string, value: string) =>
  sp.getAll(key).flatMap((v) => v.split(",")).includes(value);

function Group({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="border-b border-[var(--line)] py-4 last:border-0">
      <summary className="cursor-pointer text-sm font-bold">{title}</summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

function Checks({ name, options, sp }: { name: string; options: Option[]; sp: URLSearchParams }) {
  return (
    <>
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name={name} value={o.value} defaultChecked={has(sp, name, o.value)} className="size-4 accent-[var(--color-ink-900)]" />
          {o.label}
        </label>
      ))}
    </>
  );
}

/** Form GET murni: bekerja tanpa JavaScript, URL hasil filter bisa dibagikan. */
export function CatalogFilters({ locale, t, sp, categories, brands, features, specs }: Props) {
  return (
    <form method="get" className="card p-5">
      <input type="hidden" name="sort" value={sp.get("sort") ?? "newest"} />
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold">{t.catalog.filters}</h2>
        <Link href={`/${locale}/catalog`} className="muted text-xs underline">{t.catalog.reset}</Link>
      </div>

      <Group title={t.catalog.category}>
        <Checks name="category" sp={sp} options={categories.map((c) => ({ value: c.slug, label: pick(locale, c.nameId, c.nameEn) }))} />
      </Group>
      <Group title={t.catalog.brand}>
        <Checks name="brand" sp={sp} options={brands.map((b) => ({ value: b.slug, label: b.name }))} />
      </Group>
      <Group title={t.catalog.condition}>
        <Checks name="condition" sp={sp} options={[{ value: "REFURBISHED", label: t.condition.REFURBISHED }, { value: "USED", label: t.condition.USED }]} />
      </Group>
      <Group title={t.catalog.grade}>
        <Checks name="grade" sp={sp} options={(["A", "B", "C"] as const).map((g) => ({ value: g, label: t.grade[g] }))} />
      </Group>
      <Group title={t.catalog.price}>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" name="minPrice" min={0} step={50000} placeholder={t.catalog.min} defaultValue={sp.get("minPrice") ?? ""} aria-label={`${t.catalog.price} ${t.catalog.min}`} />
          <input className="input" type="number" name="maxPrice" min={0} step={50000} placeholder={t.catalog.max} defaultValue={sp.get("maxPrice") ?? ""} aria-label={`${t.catalog.price} ${t.catalog.max}`} />
        </div>
      </Group>
      <Group title={t.catalog.availability}>
        <Checks name="availability" sp={sp} options={(["VERIFIED", "CHECK", "PREORDER"] as const).map((a) => ({ value: a, label: t.availability[a].replace(/\s*\(.*\)/, "") }))} />
      </Group>

      {specs.length > 0 && (
        <Group title={t.catalog.specs}>
          <div className="space-y-4">
            {specs.map((s) => (
              <fieldset key={s.key} className="space-y-1.5">
                <legend className="mb-1 text-xs font-semibold">{s.label}{s.unit ? ` (${s.unit})` : ""}</legend>
                {s.type === "ENUM" && <Checks name={`s.${s.key}`} sp={sp} options={s.options.map((o) => ({ value: o, label: o }))} />}
                {s.type === "BOOLEAN" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={`s.${s.key}`} value="1" defaultChecked={sp.get(`s.${s.key}`) === "1"} className="size-4 accent-[var(--color-ink-900)]" />
                    {t.product.yes}
                  </label>
                )}
                {s.type === "NUMBER" && (
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" type="number" min={0} name={`s.${s.key}.min`} placeholder={t.catalog.min} defaultValue={sp.get(`s.${s.key}.min`) ?? ""} aria-label={`${s.label} ${t.catalog.min}`} />
                    <input className="input" type="number" min={0} name={`s.${s.key}.max`} placeholder={t.catalog.max} defaultValue={sp.get(`s.${s.key}.max`) ?? ""} aria-label={`${s.label} ${t.catalog.max}`} />
                  </div>
                )}
              </fieldset>
            ))}
          </div>
        </Group>
      )}

      {features.length > 0 && (
        <Group title={t.catalog.features} open={false}>
          <Checks name="feature" sp={sp} options={features.map((f) => ({ value: f, label: f.replace(/-/g, " ") }))} />
        </Group>
      )}
      <Group title={t.catalog.battery} open={false}>
        <input className="input" type="number" name="battery" min={0} max={100} defaultValue={sp.get("battery") ?? ""} aria-label={t.catalog.battery} />
      </Group>

      <button type="submit" className="btn btn-primary mt-4 w-full">{t.catalog.apply}</button>
    </form>
  );
}
