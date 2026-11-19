import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };
/**
 * WAJIB dinamis: CSP admin memakai nonce per permintaan. Bila halaman ini di-prerender statis, skrip Next
 * tidak membawa nonce, diblokir browser, dan halaman tidak pernah hidrasi (tombol lihat-sandi tidak jalan).
 */
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return <LoginForm expired={expired === "1"} />;
}
