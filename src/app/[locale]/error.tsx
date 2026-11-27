"use client";

import { StateScreen } from "@/components/state-screen";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StateScreen kind="error" reset={reset} />;
}
