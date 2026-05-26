"use client";

import { useRouter } from "next/navigation";

export function FloatingHistoryButtons() {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/tablet");
  }

  function goForward() {
    if (typeof window !== "undefined") {
      window.history.forward();
    }
  }

  return (
    <nav
      aria-label="태블릿 브라우저 이동"
      className="fixed bottom-5 left-4 z-40 flex gap-2 rounded-full border border-white/30 bg-white/35 p-1.5 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.22)] backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={goBack}
        className="grid h-11 w-11 place-items-center rounded-full border border-white/50 bg-white/75 text-xl font-black shadow-sm transition active:scale-95"
        aria-label="뒤로가기"
      >
        ←
      </button>
      <button
        type="button"
        onClick={goForward}
        className="grid h-11 w-11 place-items-center rounded-full border border-white/50 bg-white/75 text-xl font-black shadow-sm transition active:scale-95"
        aria-label="앞으로가기"
      >
        →
      </button>
    </nav>
  );
}
