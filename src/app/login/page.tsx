"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified auth for demo purposes as requested for "trusted people"
    // In a production app, use proper Firebase Auth
    if (password === "tropicalholidays") {
      localStorage.setItem("auth", "true");
      router.push("/");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Tropical Holidays</CardTitle>
          <CardDescription>Authorized Access Only</CardDescription>
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
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Enter System
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Tropical Holidays
        </CardFooter>
      </Card>
    </div>
  );
}
