"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("nimbus_token");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400 text-sm">
      Routing session...
    </div>
  );
}
