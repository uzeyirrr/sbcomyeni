"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { isUserAuthenticated } from "@/lib/pocketbase";
import { Toaster } from "sonner";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!isUserAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
      <Toaster />
    </>
  );
}
