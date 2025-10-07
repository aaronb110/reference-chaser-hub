"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`refevo-card ${className}`}>{children}</div>;
}
