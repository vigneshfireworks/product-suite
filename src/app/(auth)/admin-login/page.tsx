"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }
      login(data.token, data.user);
      if (data.user.role === "admin") router.push("/admin");
      else if (data.user.role === "partner") router.push("/partner");
      else router.push("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Management Login</h1>
          <p className="text-slate-500 text-sm mt-1">Admin & Partner Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username / Email"
            type="text"
            placeholder="Admin email or username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white" size="lg" loading={loading}>
            Secure Sign In
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Customer?{" "}
            <a href="/login" className="text-slate-800 font-semibold hover:underline">Go to Store Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
