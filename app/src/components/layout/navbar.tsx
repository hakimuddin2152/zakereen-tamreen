"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const isGod = user.role === "GOD";
  const isPrivileged = isCoordinator(user.role);
  const isMC = can(user.role, Permission.PARTY_CREATE);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);

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
