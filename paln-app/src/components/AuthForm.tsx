"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password");
          setIsLoading(false);
          return;
        }
      } else {
        const registerRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!registerRes.ok) {
          const data = await registerRes.json();
          setError(data.detail || "Registration failed");
          setIsLoading(false);
          return;
        }

        const loginResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (loginResult?.error) {
          setError("Auto-login failed. Please try logging in.");
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(false);
      router.push("/chats");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="w-full max-w-md">
      <div className="border-4 border-neo-black bg-neo-white shadow-neo p-8">
        <h2 className="text-3xl font-black text-neo-black mb-2">
          {isLogin ? "WELCOME BACK" : "GET STARTED"}
        </h2>
        <p className="text-sm font-medium text-neo-black/60 mb-6">
          {isLogin
            ? "Sign in to continue to your dashboard"
            : "Create an account to get started"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-neo-black mb-1.5">
                NAME
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neo-black/50" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 p-3 border-2 border-neo-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neo-pink"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-neo-black mb-1.5">
              EMAIL
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neo-black/50" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 p-3 border-2 border-neo-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neo-pink"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-neo-black mb-1.5">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neo-black/50" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 p-3 border-2 border-neo-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neo-pink"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-neo-black mb-1.5">
                CONFIRM PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neo-black/50" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 p-3 border-2 border-neo-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neo-pink"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {isLogin && (
            <div className="text-right">
              <a
                href="#"
                className="text-xs font-bold text-neo-pink hover:underline"
              >
                FORGOT PASSWORD?
              </a>
            </div>
          )}

          {error && (
            <div className="p-3 border-2 border-neo-pink bg-neo-pink/10 text-neo-black text-sm font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-neo-yellow text-neo-black border-2 border-neo-black font-black text-sm shadow-neo hover:shadow-neo-hover hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              "PLEASE WAIT..."
            ) : (
              <>
                {isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm font-medium text-neo-black/70">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="font-bold text-neo-pink hover:underline"
            >
              {isLogin ? "SIGN UP" : "SIGN IN"}
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t-2 border-neo-black/20">
          <p className="text-xs font-medium text-center text-neo-black/50 mb-3">
            OR CONTINUE WITH
          </p>
          <div className="flex gap-3">
            <button className="flex-1 py-2.5 border-2 border-neo-black bg-neo-white font-bold text-xs hover:bg-neo-black hover:text-neo-white transition-colors">
              GOOGLE
            </button>
            <button className="flex-1 py-2.5 border-2 border-neo-black bg-neo-white font-bold text-xs hover:bg-neo-black hover:text-neo-white transition-colors">
              GITHUB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
