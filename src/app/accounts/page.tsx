"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient"; // ⬅️ note the path change (one level up from /app)

type Account = {
  id: string;
  name: string;
  overdue_days: number;
  created_at: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [overdueDays, setOverdueDays] = useState(7);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, name, overdue_days, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching accounts:", error);
    } else {
      setAccounts(data || []);
    }
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("accounts").insert([
      { name, overdue_days: overdueDays },
    ]);
    if (error) {
      console.error("Error adding account:", error);
    } else {
      setName("");
      setOverdueDays(7);
      fetchAccounts();
    }
  }

  async function updateAccount(id: string, overdue: number) {
    const { error } = await supabase
      .from("accounts")
      .update({ overdue_days: overdue })
      .eq("id", id);
    if (error) {
      console.error("Error updating account:", error);
    } else {
      fetchAccounts();
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Accounts</h1>

      <form onSubmit={addAccount} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Account Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded flex-1"
          required
        />
        <input
          type="number"
          value={overdueDays}
          onChange={(e) => setOverdueDays(Number(e.target.value))}
          className="border p-2 rounded w-28"
          min={1}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {accounts.map((acc) => (
          <li
            key={acc.id}
            className="p-3 border rounded flex items-center justify-between"
          >
            <span>
              <strong>{acc.name}</strong> – {acc.overdue_days} days
            </span>
            <input
              type="number"
              value={acc.overdue_days}
              onChange={(e) => updateAccount(acc.id, Number(e.target.value))}
              className="border p-1 rounded w-20"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
