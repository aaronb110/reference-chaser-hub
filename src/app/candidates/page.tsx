'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Toast from '@/components/Toast';

// ----------------- Types -----------------
type Candidate = {
  id: string;
  full_name: string;
  email: string;
  created_at?: string;
  created_by?: string;
  user?: {
    email: string;
  };
};

type UserOption = {
  id: string;
  email: string;
};

// ----------------- AddRefereeModal -----------------
function AddRefereeModal({ candidateId, candidateName, onClose }: { candidateId: string; candidateName: string; onClose: () => void }) {
  const [refName, setRefName] = useState('');
  const [refEmail, setRefEmail] = useState('');
  const [refPhone, setRefPhone] = useState('');
  const [refRelationship, setRefRelationship] = useState('');
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const smsEnabled = true; // later from account settings

  const handleSave = async () => {
    if (!refName || !refEmail || (smsEnabled && !refPhone)) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(refEmail)) {
      setToast({ message: 'Please enter a valid referee email', type: 'error' });
      return;
    }

    let formattedPhone = refPhone;
    if (smsEnabled && refPhone) {
      formattedPhone = formattedPhone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1);
      }
      formattedPhone = '+44' + formattedPhone;
    }

    const { data: referee, error: refError } = await supabase
      .from('referees')
      .insert([{ full_name: refName, email: refEmail, phone: formattedPhone, relationship: refRelationship }])
      .select()
      .single();

    if (refError) {
      setToast({ message: `Error saving referee: ${refError.message}`, type: 'error' });
      return;
    }

    const { error: reqError } = await supabase
      .from('reference_requests')
      .insert([{ candidate_id: candidateId, referee_id: referee.id, status: 'pending' }]);

    if (reqError) {
      setToast({ message: `Error linking referee: ${reqError.message}`, type: 'error' });
      return;
    }

    setToast({ message: `Referee added for ${candidateName} ✅`, type: 'success' });
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">➕ Add Referee for {candidateName}</h3>

        <div className="space-y-3 mb-6">
          <input type="text" value={refName} onChange={(e) => setRefName(e.target.value)} placeholder="Full Name *" className="w-full border rounded-lg px-3 py-2" />
          <input type="email" value={refEmail} onChange={(e) => setRefEmail(e.target.value)} placeholder="Email *" className="w-full border rounded-lg px-3 py-2" />
          <div className="flex space-x-2">
            <select value="+44" disabled className="border rounded-lg px-3 py-2 bg-gray-100">
              <option value="+44">🇬🇧 +44</option>
            </select>
            <input type="tel" value={refPhone} onChange={(e) => setRefPhone(e.target.value.replace(/\D/g, ''))} placeholder="07700123456" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <input type="text" value={refRelationship} onChange={(e) => setRefRelationship(e.target.value)} placeholder="Relationship (e.g. Manager)" className="w-full border rounded-lg px-3 py-2" />
        </div>

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save Referee</button>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}

// ----------------- Candidates Page -----------------
export default function CandidatesPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [showAddReferee, setShowAddReferee] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    fetchCandidates();
    fetchUsers();

    const channel = supabase
      .channel('candidates-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        fetchCandidates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

const fetchCandidates = async () => {
  const { data, error } = await supabase
    .from("candidates")
    .select("id, full_name, email, created_at, created_by");

  if (error) {
    setToast({ message: `Error: ${error.message}`, type: "error" });
    return;
  }
  setCandidates(data || []);
};


  const fetchUsers = async () => {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (!error && data?.users) {
      setUsers(data.users.map((u) => ({ id: u.id, email: u.email || 'unknown' })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('candidates').insert([{ 
      full_name: fullName, 
      email, 
      created_by: user?.id || null 
    }]);

    if (error) {
      setToast({ message: `Error: ${error.message}`, type: 'error' });
    } else {
      setToast({ message: 'Candidate saved ✅', type: 'success' });
      setFullName('');
      setEmail('');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) {
      setToast({ message: `Error deleting: ${error.message}`, type: 'error' });
    } else {
      setToast({ message: `Deleted ${name} ✅`, type: 'success' });
    }
  };

  // ----------------- Filtering -----------------
  const visibleCandidates = selectedUser === 'all'
    ? candidates
    : candidates.filter(c => c.created_by === selectedUser);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Candidates</h1>

      {/* Filter */}
      <div className="mb-4">
        <label className="text-sm font-medium mr-2">Filter by user:</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500" />
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
      </form>

      {/* List */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Saved candidates</h2>
        {visibleCandidates.length === 0 ? (
          <p className="text-gray-600">No candidates yet.</p>
        ) : (
          <ul className="space-y-3">
            {visibleCandidates.map((c) => (
              <li key={c.id} className="bg-white shadow rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.full_name}</p>
                  <p className="text-sm text-gray-600">{c.email}</p>
                  {c.created_at && <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</p>}
                  {c.created_by && <p className="text-xs text-gray-400">Added by: {c.created_by}</p>}

                </div>
                <div className="flex space-x-2">
                  <button onClick={() => { setActiveCandidate(c); setShowAddReferee(true); }} className="text-green-600 hover:text-green-700 text-sm border border-green-200 rounded-md px-3 py-1">
                    ➕ Add Referee
                  </button>
                  <button onClick={() => handleDelete(c.id, c.full_name)} className="text-red-600 hover:text-red-700 text-sm border border-red-200 rounded-md px-3 py-1">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Referee Modal */}
      {showAddReferee && activeCandidate && (
        <AddRefereeModal candidateId={activeCandidate.id} candidateName={activeCandidate.full_name} onClose={() => setShowAddReferee(false)} />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
