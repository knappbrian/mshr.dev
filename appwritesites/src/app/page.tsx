"use client";

import { useState, useEffect, FormEvent } from "react";
import { account } from "@/lib/appwrite";
import { Copy, Check, Loader2, Link as LinkIcon, AlertCircle, Moon, Sun, ArrowLeft } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ shortUrl: string; expiryLabel: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [mountTime, setMountTime] = useState<number>(Date.now());
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    setMountTime(Date.now());
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (honeypot || Date.now() - mountTime < 2000) {
      setError("An error occurred during submission. Please try again.");
      return;
    }

    if (!url) {
      setError("Please enter a valid URL.");
      return;
    }

    try {
      setLoading(true);
      
      let jwtData;
      try {
        jwtData = await account.createJWT();
      } catch (err: any) {
        // No active session exists, create an anonymous one first
        await account.createAnonymousSession();
        jwtData = await account.createJWT();
      }
      const jwt = jwtData.jwt;

      const response = await fetch("https://mshr.dev/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-appwrite-jwt": jwt,
        },
        body: JSON.stringify({ url, expiry, honeypot }),
      });

      if (!response.ok) throw new Error("Failed to shorten link.");

      const data = await response.json();
      const expiryLabels: Record<string, string> = { "30m": "30m", "2h": "2h", "24h": "24h", "1w": "1w" };
      
      setResult({
        shortUrl: `mshr.dev/${data.code}`,
        expiryLabel: expiry !== "never" ? expiryLabels[expiry] : "",
      });
      
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(`https://${result.shortUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
      {/* Header / Nav */}
      <header className="flex justify-between items-center p-6 w-full max-w-5xl mx-auto">
        <a 
          href="https://bostonme.sh" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          bostonme.sh
        </a>
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">mshr.dev</h1>
            <p className="opacity-60 text-sm">Link shortener.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input 
              type="text" 
              name="website_url_catch" 
              value={honeypot} 
              onChange={(e) => setHoneypot(e.target.value)} 
              className="opacity-0 absolute -z-10 w-0 h-0" 
              tabIndex={-1} aria-hidden="true" autoComplete="off" 
            />

            <div className="space-y-1.5 group">
              <label htmlFor="url" className="text-xs font-semibold uppercase tracking-wider opacity-80 group-focus-within:opacity-100 transition-opacity">Destination URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-50 group-focus-within:opacity-100 transition-opacity">
                  <LinkIcon className="h-4 w-4" />
                </div>
                <input
                  id="url"
                  type="url"
                  placeholder="https://example.com/long/link"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-transparent border border-black/20 dark:border-white/20 rounded-md focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label htmlFor="expiry" className="text-xs font-semibold uppercase tracking-wider opacity-80 group-focus-within:opacity-100 transition-opacity">Expiration</label>
              <div className="relative">
                <select
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-3 py-2.5 bg-transparent border border-black/20 dark:border-white/20 rounded-md focus:outline-none focus:border-black dark:focus:border-white transition-colors appearance-none cursor-pointer text-sm"
                >
                  <option value="never" className="dark:bg-[#0a0a0a]">Never</option>
                  <option value="30m" className="dark:bg-[#0a0a0a]">30 Minutes</option>
                  <option value="2h" className="dark:bg-[#0a0a0a]">2 Hours</option>
                  <option value="24h" className="dark:bg-[#0a0a0a]">24 Hours</option>
                  <option value="1w" className="dark:bg-[#0a0a0a]">1 Week</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none opacity-50 group-focus-within:opacity-100 transition-opacity">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-1 bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-900/50 animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-4 bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-medium rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Shortening...</span>
                </>
              ) : (
                <span>Shorten</span>
              )}
            </button>
          </form>

          {result && (
            <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Your shortened link</span>
                {result.expiryLabel && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 opacity-80">
                    Exp: {result.expiryLabel}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between border border-black/20 dark:border-white/20 rounded-md p-1 pl-3 bg-black/5 dark:bg-white/5 transition-colors hover:border-black/40 dark:hover:border-white/40">
                <span className="font-mono text-sm truncate pr-2 select-all font-medium">
                  {result.shortUrl}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center justify-center p-2 bg-white dark:bg-[#0a0a0a] border border-black/20 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-neutral-900 active:scale-95 rounded transition-all"
                  aria-label="Copy to clipboard"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
