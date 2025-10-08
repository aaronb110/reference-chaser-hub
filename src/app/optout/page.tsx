"use client";

export default function OptOutInvalidPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-md text-center bg-slate-800/60 backdrop-blur-lg border border-slate-700 rounded-2xl p-10 shadow-2xl">
        <div className="mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-14 w-14 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold mb-3">Link expired or invalid</h1>
        <p className="text-slate-300 mb-6">
          This unsubscribe link is no longer valid.  
          Please{" "}
          <a
            href="mailto:hello@refevo.com?subject=Manual%20Unsubscribe%20Request"
            className="text-teal-400 hover:text-teal-300 underline"
          >
            email us
          </a>{" "}
          if you still wish to opt out.
        </p>

        <a
          href="/"
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