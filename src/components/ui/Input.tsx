"use client";

interface InputProps {
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}

export default function Input({
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="refevo-input"
    />
  );
}
