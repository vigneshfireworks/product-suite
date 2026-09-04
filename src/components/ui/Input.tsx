import React from "react";
import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export function Input({ label, error, wrapperClassName, className, ...props }: InputProps) {
  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      {label && <label className="text-sm font-semibold text-brand-dark">{label}</label>}
      <input
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-brand-dark text-sm",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
          "placeholder:text-gray-400 transition-all",
          error ? "border-red-400" : "border-gray-200",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, wrapperClassName, className, options, ...props }: SelectProps) {
  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      {label && <label className="text-sm font-semibold text-brand-dark">{label}</label>}
      <select
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-brand-dark text-sm",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
          error ? "border-red-400" : "border-gray-200",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export function Textarea({ label, error, wrapperClassName, className, ...props }: TextareaProps) {
  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      {label && <label className="text-sm font-semibold text-brand-dark">{label}</label>}
      <textarea
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-brand-dark text-sm",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
          "resize-none placeholder:text-gray-400 transition-all",
          error ? "border-red-400" : "border-gray-200",
          className
        )}
        rows={4}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
