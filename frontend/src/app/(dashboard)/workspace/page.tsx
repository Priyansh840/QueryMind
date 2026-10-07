"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkspaceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/spaces");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", color: "var(--text-tertiary)", fontSize: "14px" }}>
      Redirecting to Spaces...
    </div>
  );
}
