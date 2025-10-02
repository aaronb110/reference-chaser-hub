'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Toast from '@/components/Toast';

type Referee = {
  id: string;
  candidate_id: string;
  full_name: string;
  email: string;
  created_at?: string;
};

export default function RefereesPage() {
  const [candidateId, setCandidateId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [referees, setReferees] = useState<Referee[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchCandidates();
    fetchReferees();

    const refChannel = supabase
      .channel('referees-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referees' },
        () => fetchReferees()
      )
      .subscribe();

    const candChannel = supabase
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidates' },
        () => fetchCandidates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(refChannel);
      supabase.removeChannel(candChannel);
    };
  }, []);

  const fetchCandidates = async () => {
    const { data, error } = await supabase.from('candidates').select('*');
    if (!error && data) setCandidates(data);
  };

  const fetchReferees = async () => {
    const { data, error } = await supabase.from('referees').select('*');
    if (!error && data) setReferees(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) {
      setToast({ message: 'Please select a candidate', type: 'error' });
      return;
    }

    const { error } = await supabase
      .from('referees')
      .insert([{ candidate_id: candidateId, full_name: fullName, email }]);

    if (error) {
      setToast({ message: `Error: ${error.message}`, type: 'error' });
    } else {
      setToast({ message: 'Referee saved ✅', type: 'success' });
      setFullName('');
      setEmail('');
      setCandidateId('');
    }
  };

  const handleEdit = async (r: Referee) => {
    const newName = prompt("Enter new name:", r.full_name);
    const newEmail = prompt("Enter new email:", r.email);

    if (newName && newEmail) {
      const { error } = await supabase
        .from('referees')
        .update({ full_name: newName, email: newEmail })
        .eq('id', r.id);

      if (error) {
        setToast({ message: `Error updating: ${error.message}`, type: 'error' });
      } else {
        setToast({ message: `Updated ${r.full_name} ✅`, type: 'success' });
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from('referees').delete().eq('id', id);
    if (error) {
      setToast({ message: `Error deleting: ${error.message}`, type: 'error' });
    } else {
      setToast({ message: `Deleted ${name} ✅`, type: 'success' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Referees</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Candidate</label>
          <select
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
          >
            <option value="">Select candidate...</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Save
        </button>
      </form>

      {/* List */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Saved referees</h2>
        {referees.length === 0 ? (
          <p className="text-gray-600">No referees yet.</p>
        ) : (
          <ul className="space-y-3">
            {referees.map((r) => (
              <li
                key={r.id}
                className="bg-white shadow rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{r.full_name}</p>
                  <p className="text-sm text-gray-600">{r.email}</p>
                  {r.created_at && (
                    <p className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(r)}
                    className="text-blue-600 hover:text-blue-700 text-sm border border-blue-200 rounded-md px-3 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id, r.full_name)}
                    className="text-red-600 hover:text-red-700 text-sm border border-red-200 rounded-md px-3 py-1"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
