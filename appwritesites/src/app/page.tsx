"use client";

import { useState, useEffect, FormEvent } from "react";
import { account } from "@/lib/appwrite";
import { Copy, Check, Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ shortUrl: string; expiryLabel: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [mountTime, setMountTime] = useState<number>(Date.now());

  useEffect(() => {
    setMountTime(Date.now());
    
    const initAuth = async () => {
      try {
        await account.get();
      } catch (e: any) {
        if (e.code === 401) {
          try {
            await account.createAnonymousSession();
          } catch (sessionErr) {
            console.error("Failed to create anonymous session", sessionErr);
          }
        }
      }
    };
    initAuth();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Bot prevention 1: Honeypot
    if (honeypot) {
      setError("An error occurred during submission. Please try again.");
      return;
    }

    // Bot prevention 2: Submission Timer (< 2 seconds)
    if (Date.now() - mountTime < 2000) {
      setError("An error occurred during submission. Please try again.");
      return;
    }

    if (!url) {
      setError("Please enter a valid URL.");
      return;
    }

    try {
      setLoading(true);
      
      const jwtData = await account.createJWT();
      const jwt = jwtData.jwt;

      const response = await fetch("https://mshr.dev/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-appwrite-jwt": jwt,
        },
        body: JSON.stringify({
          url,
          expiry,
          honeypot,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to shorten link.");
      }

      const data = await response.json();
      
      // Determine expiry label for badge
      const expiryLabels: Record<string, string> = {
        "30m": "30 Minutes",
        "2h": "2 Hours",
        "24h": "24 Hours",
        "1w": "1 Week",
      };
      
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24 relative overflow-hidden">
      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            app.mshr.dev
          </h1>
          <p className="text-slate-400">Minimalist link management</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 sm:p-8 relative">
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Honeypot field - completely invisible to humans but in DOM for bots */}
            <input 
              type="text" 
              name="website_url_catch" 
              value={honeypot} 
              onChange={(e) => setHoneypot(e.target.value)} 
              className="opacity-0 absolute -z-10 w-0 h-0" 
              tabIndex={-1} 
              aria-hidden="true" 
              autoComplete="off" 
            />

            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium text-slate-300 ml-1">Destination URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <input
                  id="url"
                  type="url"
                  placeholder="https://example.com/very/long/link"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="expiry" className="text-sm font-medium text-slate-300 ml-1">Expiration</label>
              <div className="relative">
                <select
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white appearance-none cursor-pointer"
                >
                  <option value="never" className="bg-slate-900 text-white">Never</option>
                  <option value="30m" className="bg-slate-900 text-white">30 Minutes</option>
                  <option value="2h" className="bg-slate-900 text-white">2 Hours</option>
                  <option value="24h" className="bg-slate-900 text-white">24 Hours</option>
                  <option value="1w" className="bg-slate-900 text-white">1 Week</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/10 border border-red-400/20 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Shortening...</span>
                </>
              ) : (
                <span>Shorten</span>
              )}
            </button>
          </form>

          {result && (
            <div className="mt-8 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-300">Your shortened link:</span>
                {result.expiryLabel && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Expires in {result.expiryLabel}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2 relative group">
                <div className="flex-1 px-3 py-2 text-blue-300 font-medium truncate select-all">
                  {result.shortUrl}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                  aria-label="Copy to clipboard"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  <span className="text-sm font-medium">{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MeshCore. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
