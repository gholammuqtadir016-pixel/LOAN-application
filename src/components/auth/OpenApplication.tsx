"use client";

import { useRouter } from "next/navigation";
import { useLoanStore } from "@/store/loanStore";

export function OpenApplication({ id }: { id: string }) {
  const router = useRouter();
  const reset = useLoanStore((state) => state.reset);

  function openApplication() {
    reset();
    localStorage.setItem("loan-draft-id", id);
    router.push("/apply");
    router.refresh();
  }

  return (
    <button type="button" onClick={openApplication}>
      Open application
    </button>
  );
}
