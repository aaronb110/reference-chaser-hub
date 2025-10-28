'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import clsx from 'clsx';

type Props = {
  onAdded?: () => void;
  notify?: (message: string, type?: 'success' | 'error' | 'info') => void;
  className?: string;
};

type Errors = Partial<Record<'full_name' | 'email' | 'mobile', string>>;

function validateEmail(email: string) {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isUkMobileStarting07(raw: string) {
  const digits = raw.replace(/\D/g, '');
  return /^07\d{9}$/.test(digits);
}

/** Convert "07xxxxxxxxx" -> "+447xxxxxxxxx" (E.164) */
function toE164Uk(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (!/^07\d{9}$/.test(digits)) {
    throw new Error('Invalid UK mobile format');
  }
  return '+44' + digits.slice(1);
}

export default function AddCandidateWidget({ onAdded, notify, className }: Props) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => nameRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  function resetForm() {
    setFullName('');
    setEmail('');
    setMobile('');
    setErrors({});
    setSubmitting(false);
    setJustSaved(false);
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!fullName.trim()) e.full_name = 'Full name is required.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!validateEmail(email)) e.email = 'Enter a valid email address.';
    if (!mobile.trim()) e.mobile = 'Mobile number is required.';
    else if (!isUkMobileStarting07(mobile)) {
      e.mobile = 'Enter a UK mobile starting 07 (11 digits).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

async function handleSubmit(ev?: React.FormEvent) {
  ev?.preventDefault();
  if (submitting) return;

  const valid = validate();
  if (!valid) {
    notify?.('Please correct the highlighted fields.', 'error');
    return;
  }

  try {
    setSubmitting(true);

    // ✅ fail-safe guard for empty or invalid numbers
    if (!mobile.trim() || !isUkMobileStarting07(mobile)) {
      notify?.('Enter a valid UK mobile starting 07 (11 digits).', 'error');
      setSubmitting(false);
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const e164 = toE164Uk(mobile);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) throw userErr;
    if (!user) throw new Error('No authenticated user found.');

    const payload = {
      full_name: fullName.trim(),
      email: emailLower,
      mobile: e164,
      created_by: user.id,
    };

    const { error: insertErr } = await supabase.from('candidates').insert(payload);
    if (insertErr) throw insertErr;

    notify?.('Candidate added successfully!', 'success');
    setJustSaved(true);
    onAdded?.();

    setTimeout(() => closeModal(), 3000);
  } catch (err: any) {
    notify?.(err?.message || 'Something went wrong creating the candidate.', 'error');
    setSubmitting(false);
  }
}


  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-white shadow hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        + Add Candidate
      </button>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => (!submitting ? closeModal() : null)}
          />

          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Add Candidate</h2>
              <p className="text-sm text-slate-300">Create a new candidate record.</p>
            </div>

            {justSaved && (
              <div className="mb-4 rounded-lg border border-teal-600 bg-teal-900/30 px-3 py-2 text-sm text-teal-200">
                Candidate saved. Closing in 3 seconds…
              </div>
            )}

            {/* Full name */}
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="full_name">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              id="full_name"
              ref={nameRef}
              className={clsx(
                'mb-2 w-full rounded-xl border bg-slate-800 px-3 py-2 text-white outline-none',
                errors.full_name ? 'border-red-500' : 'border-slate-600 focus:border-teal-500'
              )}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              disabled={submitting || justSaved}
              required
            />
            {errors.full_name && <p className="mb-3 text-xs text-red-400">{errors.full_name}</p>}

            {/* Email */}
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={clsx(
                'mb-2 w-full rounded-xl border bg-slate-800 px-3 py-2 text-white outline-none',
                errors.email ? 'border-red-500' : 'border-slate-600 focus:border-teal-500'
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              disabled={submitting || justSaved}
              autoComplete="email"
              required
            />
            {errors.email && <p className="mb-3 text-xs text-red-400">{errors.email}</p>}

            {/* Mobile */}
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="mobile">
              Mobile (UK) <span className="text-red-400">*</span>
            </label>
            <input
              id="mobile"
              inputMode="numeric"
              required
              className={clsx(
                'mb-2 w-full rounded-xl border bg-slate-800 px-3 py-2 text-white outline-none',
                errors.mobile ? 'border-red-500' : 'border-slate-600 focus:border-teal-500'
              )}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="07xxxxxxxxx"
              disabled={submitting || justSaved}
            />
            {errors.mobile && <p className="mb-3 text-xs text-red-400">{errors.mobile}</p>}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting || justSaved}
                className="rounded-xl border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || justSaved}
                className={clsx(
                  'rounded-xl bg-teal-500 px-4 py-2 text-white shadow',
                  submitting
                    ? 'opacity-70'
                    : 'hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400'
                )}
              >
                {submitting ? 'Saving…' : justSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
