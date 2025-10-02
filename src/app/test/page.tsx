'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestPage() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SUPABASE KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const testConnection = async () => {
      const { data, error } = await supabase.from('candidates').select('*').limit(1);

      if (error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus('Connected ✅ Supabase query succeeded');
      }
    };

    testConnection();
  }, []);

  return (
    <main style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Supabase Test</h1>
      <p>Status: {status}</p>
    </main>
  );
}
