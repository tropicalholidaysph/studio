"use client";

import { useEffect, useState } from "react";
import { fetchAllVouchers } from "@/services/supabaseService";

export default function TestSupabase() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    console.log("Starting Supabase fetch test...");
    fetchAllVouchers()
      .then(res => {
        console.log("SUCCESS: Supabase Vouchers Received", res);
        setData(res);
      })
      .catch(err => {
        console.error("FAILURE: Supabase Fetch Error", err);
        setError(err);
      });
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#3b82f6" }}>Supabase Connection Test</h1>
      <hr />
      {error && (
        <div style={{ background: "#fee2e2", padding: "10px", borderRadius: "5px", marginTop: "20px" }}>
          <h3 style={{ color: "#b91c1c" }}>Error</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      {data ? (
        <div style={{ marginTop: "20px" }}>
          <p style={{ fontWeight: "bold" }}>Found {data.length} vouchers in Supabase.</p>
          <div style={{ background: "#f3f4f6", padding: "15px", borderRadius: "8px", overflowX: "auto" }}>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      ) : !error ? (
        <p>🔄 Loading vouchers from Supabase...</p>
      ) : null}
    </div>
  );
}
