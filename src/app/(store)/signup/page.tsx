"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", age: "", sex: "male", phone: "", email: "", address: "", password: "", confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          age: Number(form.age),
          sex: form.sex,
          phone: form.phone,
          email: form.email,
          address: form.address,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      login(data.token, data.user);
      router.push("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-brand-dark">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join Product Suite today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="Your full name" value={form.name} onChange={update("name")} required />
            <Input label="Age" type="number" min="1" max="120" placeholder="Your age" value={form.age} onChange={update("age")} required />
          </div>

          <Select
            label="Gender"
            value={form.sex}
            onChange={update("sex")}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone Number" type="tel" placeholder="10-digit mobile" value={form.phone} onChange={update("phone")} required />
            <Input label="Email Address" type="email" placeholder="your@email.com" value={form.email} onChange={update("email")} required />
          </div>

          <Input label="Address" placeholder="Your full address" value={form.address} onChange={update("address")} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Password" type="password" placeholder="Min 6 characters" value={form.password} onChange={update("password")} required />
            <Input label="Confirm Password" type="password" placeholder="Repeat password" value={form.confirm} onChange={update("confirm")} required />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Create Account
          </Button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
