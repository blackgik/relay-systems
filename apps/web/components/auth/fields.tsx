'use client';

import React, { useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiBase } from '@/lib/api';

// Form controls for the auth and onboarding screens: filled, roomy inputs
// in the style of the auth card, built on the semantic tokens.

const fieldBox =
  'w-full rounded-xl border bg-surface px-4 text-body-l text-text-primary placeholder:text-text-tertiary transition-colors focus:border-brand focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60 dark:focus:border-harbor-200';

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Placeholder-only look (auth screens); the label stays for screen readers. */
  hideLabel?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  trailing?: React.ReactNode;
};

export function Field({ label, hideLabel, error, hint, trailing, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'text-label-l text-text-primary'}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${inputId}-note` : undefined}
          placeholder={hideLabel ? label : props.placeholder}
          className={clsx(fieldBox, 'h-14', !!trailing && 'pr-12', error ? 'border-destructive' : 'border-border')}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>}
      </div>
      {(error || hint) && (
        <p id={`${inputId}-note`} className={clsx('text-body-s', error ? 'text-destructive' : 'text-text-tertiary')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  error,
  options,
  placeholder = 'Select…',
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string | null;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-label-l text-text-primary">
        {label}
      </label>
      <select
        id={id}
        className={clsx(fieldBox, 'h-14 pr-10', error ? 'border-destructive' : 'border-border')}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-body-s text-destructive">{error}</p>}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, 'type' | 'trailing'>) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      type={show ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="rounded-lg p-1.5 text-icon-muted hover:text-text-primary"
        >
          {show ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      }
    />
  );
}

/** Rough strength meter matching the API rule (8+, letter and number). */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const score =
    (value.length >= 8 ? 1 : 0) +
    (/[A-Za-z]/.test(value) && /\d/.test(value) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(value) || value.length >= 12 ? 1 : 0) +
    (/[a-z]/.test(value) && /[A-Z]/.test(value) ? 1 : 0);
  const label = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong'][score];
  const color = score <= 1 ? 'bg-destructive' : score === 2 ? 'bg-accent-signal' : 'bg-success';
  return (
    <div className="-mt-1 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={clsx('h-1 flex-1 rounded-full', i < score ? color : 'bg-muted')} />
        ))}
      </div>
      <span className="text-body-s text-text-tertiary">{label}</span>
    </div>
  );
}

export function SubmitButton({
  busy,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy || props.disabled}
      className={clsx(
        'flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand text-title-m text-brand-foreground transition-colors hover:bg-brand-focus disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    >
      {busy && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
}

export function OrDivider({ label = 'or continue with' }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 text-body-m text-text-tertiary">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function GoogleButton({ intent = 'signin' }: { intent?: 'signin' | 'signup' }) {
  return (
    <a
      href={`${apiBase()}/auth/google?intent=${intent}`}
      className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background text-title-m text-text-primary transition-colors hover:bg-surface"
    >
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </a>
  );
}

/** Six single-digit boxes with paste, auto-advance and backspace handling. */
export function OtpInput({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  const setAt = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, 6));
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="6-digit code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (!v) return setAt(i, '');
            setAt(i, v[v.length - 1]);
            refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) {
              setAt(i - 1, '');
              refs.current[i - 1]?.focus();
            }
            if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (!pasted) return;
            e.preventDefault();
            onChange(pasted);
            refs.current[Math.min(pasted.length, 5)]?.focus();
          }}
          className={clsx(
            'h-14 w-full min-w-0 rounded-xl border bg-surface text-center text-headline-s text-text-primary focus:border-brand focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand/20 sm:h-16',
            error ? 'border-destructive' : d ? 'border-brand/40' : 'border-border'
          )}
        />
      ))}
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-destructive-subtle px-4 py-3 text-body-m text-destructive">
      {children}
    </p>
  );
}
