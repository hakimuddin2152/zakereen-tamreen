"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { can, isCoordinator, Permission } from "@/lib/permissions";
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog";

interface NavbarProps {
  user: { name?: string | null; role: string; id: string };
  unreadCount?: number;
}

export function Navbar({ user, unreadCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isGod = user.role === "GOD";
  const isPrivileged = isCoordinator(user.role);
  const isMC = can(user.role, Permission.PARTY_CREATE);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unreadCount);

  const navLinks = [
    { href: "/kalaams", label: "Kalaams" },
    { href: "/my-kalaams", label: "My Kalaams" },
    { href: "/sessions", label: "Sessions" },
    { href: "/majlis", label: "Majlis" },
    { href: "/members", label: "Members" },
    ...(isGod ? [{ href: "/admin/users", label: "Users" }] : []),
  ];

  const roleLabel = ({ GOD: "God", MC: "Mauze Coordinator", PC: "Party Coordinator", PM: "Member", IM: "Member" } as Record<string, string>)[user.role] ?? user.role;

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex flex-col leading-tight">
              <span className="text-primary font-bold text-base">Zakereen Tamreen</span>
              <span className="text-muted-foreground text-xs font-medium" dir="rtl">زاکرین تمرین</span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    pathname.startsWith(link.href)
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell (coordinators only) */}
          {isPrivileged && (
            <button
              type="button"
              className="relative flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent transition-colors"
              aria-label="Notifications"
              onClick={async () => {
                router.push("/notifications");
                if (localUnread > 0) {
                  setLocalUnread(0);
                  await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {localUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {localUnread > 99 ? "99+" : localUnread}
                </span>
              )}
            </button>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.name}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs hidden sm:block ${isPrivileged ? "border-primary text-primary" : ""}`}
                >
                  {roleLabel}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/members/${user.id}`} className="cursor-pointer">
                  My Profile
                </Link>
              </DropdownMenuItem>
              {isPrivileged && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin/members" className="cursor-pointer">Manage Members</Link>
                  </DropdownMenuItem>
                  {isMC && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/parties" className="cursor-pointer">Manage Parties</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/admin/eval-requests" className="cursor-pointer">Evaluation Requests</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setPwDialogOpen(true)}
              >
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hamburger button (mobile only) */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-md hover:bg-accent transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-0.5 bg-foreground transition-transform duration-200 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-foreground transition-opacity duration-200 ${mobileOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-foreground transition-transform duration-200 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start ${
                  pathname.startsWith(link.href)
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </div>
      )}

      <ChangePasswordDialog open={pwDialogOpen} onOpenChange={setPwDialogOpen} />
    </nav>
  );
}
