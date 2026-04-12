/**
 * @module pages/AdminMetrics
 * @description Board-level metrics dashboard for monitoring platform health.
 *
 * Provides a password-protected view of key metrics (signups, itineraries,
 * revenue) without requiring a registered admin account in the database.
 * Authentication is via the ADMIN_SECRET env var, stored in sessionStorage
 * so the board stays logged in for the browser session.
 *
 * @route /admin/metrics
 * @auth ADMIN_SECRET header (sessionStorage)
 */

import { useState, useEffect, useCallback } from "react";
import { Users, TrendingUp, MapPin, DollarSign, UserCheck, Calendar, Mail } from "lucide-react";

const SESSION_KEY = "aurelion_admin_secret";

type Metrics = {
  totalUsers: number;
  usersToday: number;
  totalItineraries: number;
  itinerariesToday: number;
  paidUsers: number;
  revenueEstimate: number;
};

type WaitlistData = { count: number; emails: string[] };

export default function AdminMetrics() {
  const [secret, setSecret] = useState<string>(() => sessionStorage.getItem(SESSION_KEY) ?? "");
  const [input, setInput] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async (s: string) => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, waitlistRes] = await Promise.all([
        fetch("/api/admin/metrics", { headers: { "x-admin-secret": s } }),
        fetch("/api/admin/waitlist", { headers: { "x-admin-secret": s } }),
      ]);
      if (metricsRes.status === 401) {
        setError("Invalid admin secret.");
        setSecret("");
        sessionStorage.removeItem(SESSION_KEY);
        setMetrics(null);
        setWaitlist(null);
        return;
      }
      if (!metricsRes.ok) {
        setError("Failed to load metrics. Please try again.");
        return;
      }
      const data: Metrics = await metricsRes.json();
      setMetrics(data);
      if (waitlistRes.ok) {
        const wl: WaitlistData = await waitlistRes.json();
        setWaitlist(wl);
      }
      setLastUpdated(new Date());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch when authenticated
  useEffect(() => {
    if (secret) {
      fetchMetrics(secret);
    }
  }, [secret, fetchMetrics]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!secret) return;
    const interval = setInterval(() => fetchMetrics(secret), 60_000);
    return () => clearInterval(interval);
  }, [secret, fetchMetrics]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sessionStorage.setItem(SESSION_KEY, input.trim());
    setSecret(input.trim());
    setInput("");
  };

  // --- Login screen ---
  if (!secret) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-8 space-y-6">
          <div>
            <h1 className="font-serif text-2xl text-foreground mb-1">Admin Metrics</h1>
            <p className="text-sm text-muted-foreground">Enter the admin secret to view platform metrics.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Admin secret"
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-serif uppercase tracking-widest disabled:opacity-50"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Metrics grid ---
  const cards = metrics
    ? [
        { icon: Users, label: "Total Users", value: metrics.totalUsers.toLocaleString(), sub: null },
        { icon: TrendingUp, label: "New Today", value: metrics.usersToday.toLocaleString(), sub: "signups" },
        { icon: MapPin, label: "Total Itineraries", value: metrics.totalItineraries.toLocaleString(), sub: null },
        { icon: Calendar, label: "Itineraries Today", value: metrics.itinerariesToday.toLocaleString(), sub: "created" },
        { icon: UserCheck, label: "Paid Users", value: metrics.paidUsers.toLocaleString(), sub: "basic + premium" },
        {
          icon: DollarSign,
          label: "Est. Revenue",
          value: `$${metrics.revenueEstimate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          sub: "lifetime estimate",
        },
        {
          icon: Mail,
          label: "Waitlist Signups",
          value: (waitlist?.count ?? 0).toLocaleString(),
          sub: "pre-launch emails",
        },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-foreground mb-1">Platform Metrics</h1>
          <p className="text-muted-foreground text-sm">
            {loading && !metrics ? "Loading..." : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
            {!loading && " · Auto-refreshes every 60s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && metrics && (
            <span className="text-xs text-muted-foreground">Refreshing…</span>
          )}
          <button
            onClick={() => fetchMetrics(secret)}
            disabled={loading}
            className="text-xs text-primary underline disabled:opacity-50"
          >
            Refresh now
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              setSecret("");
              setMetrics(null);
              setWaitlist(null);
            }}
            className="text-xs text-muted-foreground underline"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <Icon className="w-8 h-8 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className="font-serif text-2xl text-foreground">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
