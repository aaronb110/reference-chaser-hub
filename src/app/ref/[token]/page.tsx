'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function RefereeFormPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [referee, setReferee] = useState<any>(null)
  const [formData, setFormData] = useState({
    referee_name: '',
    relationship: '',
    comments: '',
    q1: '',
    q2: '',
    q3: ''
  })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (token) fetchReferee()
  }, [token])

  async function fetchReferee() {
    const { data, error } = await supabase
      .from('referees')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (!error && data) setReferee(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('referees')
      .update({
        name: formData.referee_name,
        relationship: formData.relationship,
        notes: formData.comments,
        q1: formData.q1,
        q2: formData.q2,
        q3: formData.q3,
        status: 'completed',
        response_received_at: new Date().toISOString()
      })
      .eq('token', token)

    setLoading(false)
    if (!error) setSubmitted(true)
  }

  // ────────────────────────────── Render states ──────────────────────────────
  if (loading) return <p className="p-4 text-center">Loading…</p>

  if (!referee)
    return (
      <p className="p-4 text-center text-gray-600">
        Invalid or expired reference link.
      </p>
    )

  // ✅ NEW: guard for archived referees
  if (referee.is_archived)
    return (
      <div className="p-8 text-center text-gray-600">
        This reference request has been archived and is no longer active.
      </div>
    )

  if (submitted)
    return (
      <p className="p-4 text-center">
        ✅ Thank you! Your reference has been submitted.
      </p>
    )

  // ────────────────────────────── Form ──────────────────────────────
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">
        Reference for {referee.candidate_name || 'Candidate'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Your Name</label>
          <input
            className="w-full border rounded p-2"
            value={formData.referee_name}
            onChange={(e) =>
              setFormData({ ...formData, referee_name: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block mb-1">Relationship to Candidate</label>
          <input
            className="w-full border rounded p-2"
            value={formData.relationship}
            onChange={(e) =>
              setFormData({ ...formData, relationship: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block mb-1">Comments</label>
          <textarea
            className="w-full border rounded p-2"
            rows={4}
            value={formData.comments}
            onChange={(e) =>
              setFormData({ ...formData, comments: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block mb-1">Would you rehire this person?</label>
          <select
            className="w-full border rounded p-2"
            value={formData.q1}
            onChange={(e) =>
              setFormData({ ...formData, q1: e.target.value })
            }
            required
          >
            <option value="">Select…</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">How would you rate their reliability?</label>
          <select
            className="w-full border rounded p-2"
            value={formData.q2}
            onChange={(e) =>
              setFormData({ ...formData, q2: e.target.value })
            }
            required
          >
            <option value="">Select…</option>
            <option>Excellent</option>
            <option>Good</option>
            <option>Average</option>
            <option>Poor</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Teamwork skills</label>
          <select
            className="w-full border rounded p-2"
            value={formData.q3}
            onChange={(e) =>
              setFormData({ ...formData, q3: e.target.value })
            }
            required
          >
            <option value="">Select…</option>
            <option>Excellent</option>
            <option>Good</option>
            <option>Average</option>
            <option>Poor</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          Submit Reference
        </button>
      </form>
    </div>
  )
}
