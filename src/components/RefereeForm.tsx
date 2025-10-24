"use client";

import { useState } from "react";

type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "rating";
  required?: boolean;
  scale?: number; // only used for rating
};

export default function RefereeForm({
  templateFields,
  onSubmit,
}: {
  templateFields: Field[];
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow space-y-6"
    >
      {templateFields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-slate-800 mb-1">
            {field.label}
            {field.required && <span className="text-red-600 ml-1">*</span>}
          </label>

          {field.type === "text" && (
            <input
              type="text"
              required={field.required}
              value={values[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          )}

          {field.type === "textarea" && (
            <textarea
              required={field.required}
              value={values[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
            />
          )}

          {field.type === "rating" && (
            <div className="flex gap-2">
              {Array.from({ length: field.scale || 5 }).map((_, i) => {
                const val = String(i + 1);
                return (
                  <label key={val} className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name={field.key}
                      value={val}
                      checked={values[field.key] === val}
                      onChange={() => handleChange(field.key, val)}
                      required={field.required}
                    />
                    {val}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        className="w-full bg-teal-600 text-white rounded-lg py-2 font-medium hover:bg-teal-700"
      >
        Submit Reference
      </button>
    </form>
  );
}
