import { ldJson } from "@/lib/seo";

/** Satu atau beberapa blok data terstruktur. Server component, tanpa JavaScript di browser. */
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  return (Array.isArray(data) ? data : [data]).map((d, i) => (
    // eslint-disable-next-line react/no-danger -- ldJson meng-escape "<"
    <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(d) }} />
  ));
}
