"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) return;

    const data = new FormData(e.currentTarget);
    const username = data.get("username") as string;
    const password = data.get("password") as string;

    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setLoading(true);
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 15) {
        setLocked(true);
        toast.error("Too many attempts. Try again in 15 minutes.");
        setTimeout(() => {
          setLocked(false);
          setAttempts(0);
        }, 15 * 60 * 1000);
      } else {
        toast.error("Invalid username or password");
      }
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            زاکرین تمرین
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Zakereen Tamreen</p>
        </div>

        <Card className="backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="your_username"
                  disabled={locked || loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  disabled={locked || loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || locked}
              >
                {loading ? "Signing in…" : locked ? "Locked" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground text-xs mt-6">
          Contact your admin if you need access
        </p>
      </div>
    </div>
  );
}
