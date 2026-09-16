"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/components/user-menu";

const navigation = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19V9" strokeLinecap="round" />
        <path d="M10 19V5" strokeLinecap="round" />
        <path d="M16 19v-7" strokeLinecap="round" />
        <path d="M22 19V3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          d="M3.5 7.5h6l1.7 2H20.5v9.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.5Z"
          strokeLinejoin="round"
        />
        <path d="M3.5 7.5V5.8a1.8 1.8 0 0 1 1.8-1.8h4l1.8 2h7.1a1.8 1.8 0 0 1 1.8 1.8v1.7" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        />
        <path
          d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6H4a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0V4a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 1Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] border-r border-[#3d3329] bg-[#171411] lg:flex lg:flex-col">
      <div className="flex h-full flex-col p-4">
        {/* Brand */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-3 rounded-2xl px-3 py-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c96a32] to-[#e08a45] shadow-lg shadow-[#c96a32]/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5 text-[#f1e7d0]"
            >
              <path
                d="M12 3v18M3 12h18"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <p className="text-base font-semibold tracking-tight text-[#f1e7d0]">
              FocusLog
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#766d60]">
              Focus better
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#5e554a]">
            Workspace
          </p>

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
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                  isActive
                    ? "bg-[#332b22] text-[#f1e7d0]"
                    : "text-[#766d60] hover:bg-[#211b16] hover:text-[#d8c8a8]",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-5 w-5 items-center justify-center transition",
                    isActive
                      ? "text-[#e08a45]"
                      : "text-[#655c51] group-hover:text-[#a99e8d]",
                  ].join(" ")}
                >
                  <span className="h-5 w-5">{item.icon}</span>
                </span>

                <span className="font-medium">
                  {item.label}
                </span>

                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e08a45]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="mt-5 border-t border-[#3d3329] pt-4">
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
