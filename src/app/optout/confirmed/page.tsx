"use client";

import { useEffect, useState } from "react";

export default function OptOutConfirmedPage() {
  const [seconds, setSeconds] = useState(10);
  const marketingUrl =
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL || "https://refevo.com";

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    const redirect = setTimeout(() => {
      window.location.href = marketingUrl;
    }, 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [marketingUrl]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-md text-center bg-slate-800/60 backdrop-blur-lg border border-slate-700 rounded-2xl p-10 shadow-2xl">
        <div className="mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-14 w-14 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold mb-3">You're unsubscribed</h1>
        <p className="text-slate-300 mb-6">
          You&apos;ve been successfully removed from further Refevo beta updates.{" "}
          If this was a mistake, please{" "}
          <a
            href="mailto:hello@refevo.com?subject=Re-subscribe%20to%20Refevo%20Updates"
            className="text-teal-400 hover:text-teal-300 underline"
          >
            email us
          </a>{" "}
          and we&apos;ll re-add you.
        </p>

        <div className="mb-6">
          <p className="text-sm text-slate-400">
            Redirecting to Refevo in{" "}
            <span className="text-teal-400 font-semibold">{seconds}</span> seconds...
          </p>
        </div>

        <a
          href={marketingUrl}
          className="inline-block rounded-lg bg-teal-500 text-white font-medium px-5 py-2 hover:bg-teal-400 transition-all"
        >
          Return to Refevo
        </a>

        <p className="text-xs text-slate-500 mt-4">
          © {new Date().getFullYear()} Refevo • All rights reserved
        </p>
      </div>
    </main>
  );
}
