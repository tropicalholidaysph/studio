"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useRole } from "@/lib/role-context";
import { initializeFirebase } from "@/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, History, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  action: string;
  detail: string;
  uid: string;
  role: string;
  timestamp: string;
}

export default function ActivityPage() {
  const { isAdmin, isLoading: roleLoading } = useRole();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (auth !== "true") {
      router.push("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      router.push("/");
      return;
    }

    async function fetchLogs() {
      try {
        const { firestore } = initializeFirebase();
        const q = query(
          collection(firestore, "activity_logs"),
          orderBy("timestamp", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ActivityLog));
        setLogs(data);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [isAdmin, roleLoading, router]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Card className="shadow-xl border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <History className="w-6 h-6 text-primary" />
                System Activity Audit Log
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing the last 100 security and data mutation events.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              ADMIN ONLY
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Role</TableHead>
                    <TableHead className="w-[180px]">Action</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No activity recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-[11px] whitespace-nowrap">
                          {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {log.role}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-xs">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.detail}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[10px] opacity-40">
                          {log.uid.substring(0, 8)}...
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
