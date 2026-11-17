import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };
/**
 * WAJIB dinamis: CSP admin memakai nonce per permintaan. Bila halaman ini di-prerender statis, skrip Next
 * tidak membawa nonce, diblokir browser, dan halaman tidak pernah hidrasi (tombol lihat-sandi tidak jalan).
 */
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
