"use client";

import { useState, useEffect, FormEvent } from "react";
import { account } from "@/lib/appwrite";
import { Copy, Check, Loader2, Link as LinkIcon, AlertCircle, Moon, Sun, ArrowLeft, Share2 } from "lucide-react";

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
        await account.createAnonymousSession();
        jwtData = await account.createJWT();
      }
      const jwt = jwtData.jwt;

      const response = await fetch("https://l.mshr.dev/api/shorten", {
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
        shortUrl: `l.mshr.dev/${data.code}`,
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
      {/* Boston Mesh Top Header */}
      <header className="bg-[#2c3e50] dark:bg-[#111315] border-b border-black/10 dark:border-white/5 py-3 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 group">
            <div className="bg-[#4a6741] dark:bg-[#6a8c60] p-1.5 rounded-md text-white transition-transform group-hover:scale-110">
              <Share2 className="h-4 w-4" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight hidden sm:inline">Greater Boston Mesh</span>
            <span className="text-white font-bold text-sm tracking-tight sm:hidden">GBM</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://bostonme.sh" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9db496] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Main Site
            </a>
            <button 
              onClick={toggleTheme} 
              className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="mb-10 text-center sm:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-[#4a6741] dark:text-[#6a8c60]">mshr.dev</h1>
            <p className="opacity-70 text-sm font-medium">Greater Boston Mesh link shortener.</p>
          </div>

          <div className="bg-white dark:bg-[#21262d]/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <input 
                type="text" 
                name="website_url_catch" 
                value={honeypot} 
                onChange={(e) => setHoneypot(e.target.value)} 
                className="opacity-0 absolute -z-10 w-0 h-0" 
                tabIndex={-1} aria-hidden="true" autoComplete="off" 
              />

              <div className="space-y-2 group">
                <label htmlFor="url" className="text-xs font-bold uppercase tracking-widest text-[#4a6741] dark:text-[#6a8c60] opacity-80 group-focus-within:opacity-100 transition-opacity">Destination URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                    <LinkIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="url"
                    type="url"
                    placeholder="https://example.com/long/link"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-transparent border border-black/10 dark:border-white/10 rounded-md focus:outline-none focus:border-[#4a6741] dark:focus:border-[#6a8c60] focus:ring-1 focus:ring-[#4a6741]/20 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label htmlFor="expiry" className="text-xs font-bold uppercase tracking-widest text-[#4a6741] dark:text-[#6a8c60] opacity-80 group-focus-within:opacity-100 transition-opacity">Expiration</label>
                <div className="relative">
                  <select
                    id="expiry"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 bg-transparent border border-black/10 dark:border-white/10 rounded-md focus:outline-none focus:border-[#4a6741] dark:focus:border-[#6a8c60] focus:ring-1 focus:ring-[#4a6741]/20 transition-all appearance-none cursor-pointer text-sm"
                  >
                    <option value="never" className="dark:bg-[#21262d]">Never</option>
                    <option value="30m" className="dark:bg-[#21262d]">30 Minutes</option>
                    <option value="2h" className="dark:bg-[#21262d]">2 Hours</option>
                    <option value="24h" className="dark:bg-[#21262d]">24 Hours</option>
                    <option value="1w" className="dark:bg-[#21262d]">1 Week</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-1 bg-red-50 dark:bg-red-950/10 p-2.5 rounded border border-red-200 dark:border-red-900/30 animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-[#4a6741] dark:bg-[#6a8c60] text-white hover:bg-[#3a5234] dark:hover:bg-[#7ba670] font-bold rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Shorten Link</span>
                )}
              </button>
            </form>

            {result && (
              <div className="mt-10 pt-8 border-t border-black/10 dark:border-white/10 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#4a6741] dark:text-[#6a8c60]">Success</span>
                  {result.expiryLabel && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#4a6741]/10 text-[#4a6741] dark:text-[#6a8c60] border border-[#4a6741]/20">
                      Exp: {result.expiryLabel}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between border border-black/10 dark:border-white/10 rounded-md p-1 pl-3 bg-black/5 dark:bg-black/20 transition-all hover:border-[#4a6741]/50">
                  <span className="font-mono text-sm truncate pr-2 select-all font-bold text-[#4a6741] dark:text-[#6a8c60]">
                    {result.shortUrl}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center justify-center p-2.5 bg-white dark:bg-[#1a1c1e] border border-black/10 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-90 rounded transition-all text-[#4a6741] dark:text-[#6a8c60]"
                    aria-label="Copy to clipboard"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="p-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">
        &copy; {new Date().getFullYear()} Greater Boston Mesh Network. Built for resilient communications.
      </footer>
    </div>
  );
}
