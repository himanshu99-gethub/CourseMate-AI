"use client";

import React, { useState, useEffect, useRef } from "react";
import { Cpu, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "./button";

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
  const [googleLoadError, setGoogleLoadError] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Fetch Auth Config (Google Client ID) on Mount if not in ENV
  useEffect(() => {
    if (googleClientId) return;
    
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/auth/config");
        const data = await res.json();
        if (data.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
      } catch (e) {
        console.error("Failed to load auth config:", e);
      }
    };
    fetchConfig();
  }, [googleClientId]);

  // Initialize and Render Real Google Sign-in Button if Client ID exists
  useEffect(() => {
    if (!googleClientId || !googleBtnContainerRef.current) return;

    const initializeGoogle = () => {
      if (typeof window !== "undefined" && (window as any).google) {
        try {
          const google = (window as any).google;
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          
          google.accounts.id.renderButton(
            googleBtnContainerRef.current,
            { 
              theme: "dark", 
              size: "large", 
              width: 320,
              text: "signin_with",
              shape: "pill"
            }
          );
        } catch (e) {
          setGoogleLoadError(true);
        }
      }
    };

    // Retry checking if GIS is loaded
    const checkGis = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initializeGoogle();
        clearInterval(checkGis);
      }
    }, 500);

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkGis);
      if (!(window as any).google?.accounts?.id) setGoogleLoadError(true);
    }, 5000);

    return () => {
      clearInterval(checkGis);
      clearTimeout(timeout);
    };
  }, [googleClientId]);

  // Handle Real Google JWT Callback
  const handleGoogleCredentialResponse = async (response: any) => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      // Safely parse response — server might return non-JSON on crash
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (HTTP ${res.status}). Make sure Flask backend is running.`);
      }
      if (res.ok && data.status === "success") {
        onAuthSuccess(data.token, data.user);
      } else {
        setError(data.message || "Google Login failed.");
      }
    } catch (e: any) {
      setError(e.message || "Cannot reach backend. Run: venv\\Scripts\\python.exe app.py");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Demo Google SSO Trigger
  const handleDemoGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_demo: true }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        onAuthSuccess(data.token, data.user);
      } else {
        setError(data.message || "Demo Login failed.");
      }
    } catch (e) {
      setError("Unable to connect to security server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit standard Sign In or Sign Up Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill out all fields.");
      return;
    }
    
    setIsLoading(true);
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin ? { email, password } : { name, email, password };
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (res.ok && data.status === "success") {
        onAuthSuccess(data.token, data.user);
      } else {
        setError(data.message || "Authentication failed.");
      }
    } catch (err) {
      setError("Failed to connect to backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] px-4 py-12 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#FFEF4D]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#a855f7]/5 blur-[120px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#0f172a]/65 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 transition-all duration-300">
        
        {/* Header Title */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[#FFEF4D]/10 border border-[#FFEF4D]/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(255,239,77,0.15)]">
            <Cpu className="h-6 w-6 text-[#FFEF4D] animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
            CourseMate <span className="text-[#FFEF4D] font-extrabold">AI</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            Your Premium Academic Synthesis Companion
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-[#0b0f19] border border-white/5 rounded-2xl mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(""); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
              isLogin 
                ? "bg-[#FFEF4D] text-[#030712] shadow-md font-extrabold" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
              !isLogin 
                ? "bg-[#FFEF4D] text-[#030712] shadow-md font-extrabold" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl mb-4 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#FFEF4D] focus:ring-1 focus:ring-[#FFEF4D] transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
              <input
                type="email"
                placeholder="student@coursemate.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#FFEF4D] focus:ring-1 focus:ring-[#FFEF4D] transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#FFEF4D] focus:ring-1 focus:ring-[#FFEF4D] transition-all"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FFEF4D] text-[#030712] hover:bg-[#fff37a] text-xs h-11 rounded-xl font-extrabold active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-6 shadow-[0_4px_12px_rgba(255,239,77,0.12)]"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-[#030712]/20 border-t-[#030712] rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? "Authenticate Session" : "Establish Account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold">
            <span className="bg-[#0f172a] px-3 text-neutral-500">Security Gateways</span>
          </div>
        </div>

        {/* Third-Party Auth Gateways */}
        <div className="flex flex-col items-center space-y-3">
          {googleClientId && !googleLoadError ? (
            <div ref={googleBtnContainerRef} className="w-full flex justify-center min-h-[40px] animate-in fade-in duration-300" />
          ) : (
            <button
              onClick={handleDemoGoogleLogin}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#FFEF4D]" />
              {googleLoadError ? "Google Auth Unavailable - Use Demo" : "Try Demo Login"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
