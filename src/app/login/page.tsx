
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { signInAnonymously } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "tropicalholidays") {
      setIsLoading(true);
      try {
        await signInAnonymously(auth);
        localStorage.setItem("auth", "true");
        toast({
          title: "Access Granted",
          description: "Connected to secure ledger.",
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
    <div className="min-h-screen flex items-center justify-center bg-[#F7F3F1] p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary bg-white">
        <CardHeader className="text-center">
          <div className="mx-auto w-24 h-24 relative mb-4">
            <Image 
              src="/logo.png" 
              alt="Tropical Holidays Logo" 
              fill
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-black text-[#E66E38]">Tropical Holidays</CardTitle>
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
                disabled={isLoading}
                className="h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-[#E66E38] hover:bg-[#E66E38]/90 text-white font-bold" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Enter System"}
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
