"use client";

import { cn } from "@/lib/utils";

const inputBase =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 placeholder-ink-300 shadow-sm shadow-ink-950/[0.02] transition-all focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100";

interface FieldProps {
  label?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/** Champ de formulaire avec libellé + texte d'aide (règle skill : textes de
 * formulaire lisibles ≥12px — jamais de contenu fonctionnel en dessous). */
export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 block font-mono text-xs font-semibold uppercase tracking-[0.15em] text-ink-600">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-24 resize-y", className)} {...props} />;
}

export function SelectInput({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}
