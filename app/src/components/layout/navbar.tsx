"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

interface NavbarProps {
  user: { name?: string | null; role: string; id: string };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const isPrivileged = user.role === "ADMIN" || user.role === "GOD";
  const isGod = user.role === "GOD";

  const navLinks = [
    { href: "/kalaams", label: "Kalaams" },
    { href: "/my-kalaams", label: "My Kalaams" },
    { href: "/sessions", label: "Sessions" },
    ...(isPrivileged ? [{ href: "/admin/members", label: "Members" }] : []),
    ...(isGod ? [{ href: "/admin/users", label: "Users" }] : []),
  ];

  const roleLabel = isGod ? "God" : isPrivileged ? "Admin" : "Member";

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-primary font-bold text-lg">زاکرین</span>
            <span className="text-muted-foreground text-sm hidden sm:block">Tamreen</span>
          </Link>
          <div className="flex items-center gap-1">
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
              <Link href={`/reciters/${user.id}`} className="cursor-pointer">
                My Profile
              </Link>
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
      </div>
    </nav>
  );
}
