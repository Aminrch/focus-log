"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Sidebar from "@/components/sidebar";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Sessions", href: "/sessions" },
  { label: "Analytics", href: "/analytics" },
  { label: "Projects", href: "/projects" },
  { label: "Settings", href: "/settings" },
];

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#171411] text-[#f1e7d0]">
      <Sidebar />

      <div className="lg:pl-[250px]">
        {/* Mobile navigation */}
        <div className="sticky top-0 z-30 border-b border-[#3d3329] bg-[#171411]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#c96a32] to-[#e08a45]">
                <span className="text-sm font-bold text-[#f1e7d0]">
                  F
                </span>
              </div>

              <span className="text-sm font-semibold text-[#f1e7d0]">
                FocusLog
              </span>
            </Link>

            <nav className="flex min-w-0 gap-1 overflow-x-auto">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "whitespace-nowrap rounded-lg px-2.5 py-2 text-[10px] font-medium transition",
                      isActive
                        ? "bg-[#332b22] text-[#f1e7d0]"
                        : "text-[#766d60] hover:text-[#d8c8a8]",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
