export type Candidate = {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  created_at?: string;
  created_by?: string;
  is_archived?: boolean;
  archived_by?: string | null;
  archived_at?: string | null;
  consent_token?: string | null;
  consent_status?: "pending" | "granted" | "declined" | null;
  status?: "active" | "archived" | "awaiting_consent" | null;
  template_id?: string | null;
  email_status?: string | null;
  last_invite_sent_at?: string | null;


};

export type Referee = {
  id: string;
  candidate_id: string;           // ✅ added — links referee to candidate
  full_name: string;
  email: string;
  mobile?: string | null;
  relationship?: string | null;
  created_at?: string;
};

export type Request = {
  id: string;
  candidate_id: string;
  referee_id: string;
  status: string;
  resend_count?: number;
  resend_count_14d?: number | null;
  resend_window_start?: string | null;
  created_at: string;
};
