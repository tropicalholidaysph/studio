"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Shield } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { useRole, UserRole } from "@/lib/role-context";
import { initializeFirebase } from "@/firebase";

const ACCESS_CODES: Record<string, { role: UserRole; label: string }> = {
  [process.env.NEXT_PUBLIC_ADMIN_KEY!]: { role: "admin", label: "Administrator" },
  [process.env.NEXT_PUBLIC_EMPLOYEE_KEY!]: { role: "employee", label: "Employee" },
};

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();
  const { setRole } = useRole();

  useEffect(() => {
    if (searchParams.get("reason") === "timeout") {
      toast({
        title: "Session Expired",
        description: "Your session has timed out. Please log in again.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const matched = ACCESS_CODES[password.trim().toLowerCase()];

    if (matched) {
      setIsLoading(true);
      try {
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;
        const { firestore } = initializeFirebase();

        // Save role to Firestore for security rules enforcement
        await setDoc(doc(firestore, "user_roles", user.uid), {
          role: matched.role,
          updatedAt: new Date().toISOString()
        });

        localStorage.setItem("auth", "true");
        setRole(matched.role);
        toast({
          title: "Access Granted",
          description: `Logged in as ${matched.label}. Connected to secure ledger.`,
        });
        router.push("/");
      } catch (error) {
        console.error("Auth error:", error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Could not connect to the secure database.",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Key",
        description: "The security key provided is incorrect.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-24 h-24 relative mb-4">
            <Image
              src="/logo.png"
              alt="Tropical Holidays Logo"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <CardTitle className="text-2xl font-black text-primary">Tropical Holidays</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Authorized Access Only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Security Key</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter access code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 bg-background border-input"
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Enter System"}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60">
            <Shield className="w-3 h-3" />
            <span>Different access codes provide different permission levels</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 justify-center text-xs text-muted-foreground border-t pt-4">
          <p>&copy; {new Date().getFullYear()} Tropical Holidays</p>
          <p className="opacity-50 font-mono">Secure Ledger V2.0</p>
        </CardFooter>
      </Card>
    </div>
  );
}
