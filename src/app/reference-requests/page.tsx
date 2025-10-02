'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Toast from '@/components/Toast';

type Candidate = { id: string; full_name: string };
type Referee = { id: string; candidate_id: string; full_name: string };
type Request = {
  id: string;
  status: string;
  created_at?: string;
  candidates?: { full_name: string };
  referees?: { full_name: string };
};

export default function ReferenceRequestsPage() {
  const [candidateId, setCandidateId] = useState('');
  const [refereeId, setRefereeId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchCandidates();
    fetchRequests();

    const candChannel = supabase
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidates' },
        () => fetchCandidates()
      )
      .subscribe();

    const refChannel = supabase
      .channel('referees-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referees' },
        () => {
          if (candidateId) fetchReferees(candidateId);
        }
      )
      .subscribe();

    const reqChannel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reference_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(candChannel);
      supabase.removeChannel(refChannel);
      supabase.removeChannel(reqChannel);
    };
  }, [candidateId]);

  const fetchCandidates = async () => {
    const { data, error } = await supabase.from('candidates').select('*');
    if (!error && data) setCandidates(data);
  };

  const fetchReferees = async (candId: string) => {
    const { data, error } = await supabase
      .from('referees')
      .select('*')
      .eq('candidate_id', candId);
    if (!error && data) setReferees(data);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('reference_requests')
      .select(`
        id,
        status,
        created_at,
        candidates!reference_requests_candidate_id_fkey (full_name),
        referees!reference_requests_referee_id_fkey (full_name)
      `);
    if (!error && data) setRequests(data as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('reference_requests')
      .insert([{ candidate_id: candidateId, referee_id: refereeId, status: 'pending' }]);

    if (error) {
      setToast({ message: `Error: ${error.message}`, type: 'error' });
    } else {
      setToast({ message: 'Reference request created ✅', type: 'success' });
      setCandidateId('');
      setRefereeId('');
    }
  };

  const markCompleted = async (id: string) => {
    const { error } = await supabase
      .from('reference_requests')
      .update({ status: 'completed' })
      .eq('id', id);
    if (error) {
      setToast({ message: `Error updating: ${error.message}`, type: 'error' });
    } else {
      setToast({ message: 'Marked as completed ✅', type: 'success' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('reference_requests').delete().eq('id', id);
    if (error) {
      setToast({ message: `Error deleting: ${error.message}`, type: 'error' });
    } else {
      setToast({ message: 'Deleted request ✅', type: 'success' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Reference Requests</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Candidate</label>
          <select
            value={candidateId}
            onChange={(e) => {
              setCandidateId(e.target.value);
              if (e.target.value) fetchReferees(e.target.value);
            }}
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
          <label className="block text-sm font-medium mb-1">Referee</label>
          <select
            value={refereeId}
            onChange={(e) => setRefereeId(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
          >
            <option value="">Select referee...</option>
            {referees.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Request
        </button>
      </form>

      {/* List */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Saved requests</h2>
        {requests.length === 0 ? (
          <p className="text-gray-600">No requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="bg-white shadow rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    {r.candidates?.full_name} → {r.referees?.full_name}
                  </p>
                  <p className="text-sm text-gray-600">Status: {r.status}</p>
                  {r.created_at && (
                    <p className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {r.status !== 'completed' && (
                    <button
                      onClick={() => markCompleted(r.id)}
                      className="text-green-600 hover:text-green-700 text-sm border border-green-200 rounded-md px-3 py-1"
                    >
                      Mark Completed
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
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
