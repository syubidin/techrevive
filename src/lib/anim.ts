/**
 * Animasi mikro lewat anime.js. Pustaka dimuat malas (dynamic import) hanya saat benar-benar dibutuhkan,
 * dan dilewati bila pengguna meminta gerakan dikurangi.
 */
export type EnterFrom = "bottom" | "top" | "right" | "fade";

export const reducedMotion = (): boolean => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function enter(el: HTMLElement | null, from: EnterFrom = "bottom"): Promise<void> {
  if (!el || reducedMotion()) return;
  const { animate } = await import("animejs");
  const params: Record<string, number | string | number[] | string[]> = { opacity: [0, 1], duration: from === "fade" ? 220 : 280, ease: "outCubic" };
  if (from === "bottom") params.translateY = ["24px", "0px"];
  else if (from === "top") params.translateY = ["-16px", "0px"];
  else if (from === "right") params.translateX = ["32px", "0px"];
  animate(el, params as unknown as Parameters<typeof animate>[1]);
}
