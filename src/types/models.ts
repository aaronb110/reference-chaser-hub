export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  created_by?: string | null;
  company_id?: string | null;
}

export interface Referee {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_by?: string | null;
  company_id?: string | null;
}

export interface Request {
  id: string;
  candidate_id: string;
  referee_id: string;
  status: string;
  created_at: string;
  resend_count?: number;
  last_resent_at?: string | null;
  created_by?: string | null;
  company_id?: string | null;
}
