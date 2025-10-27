export type Candidate = {
  id: string;
  full_name: string;
  email: string;
  mobile?: string | null; // ✅ add | null here
  consent_token?: string | null;
  status?: string | null;
  template_id?: string | null;
  company_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_archived?: boolean | null;
  referee_count?: number | null;
  completed_referee_count?: number | null;
  email_status?: string | null;
  referees?: Referee[];
  consent_status?: "pending" | "granted" | "declined" | null;
  consent_at?: string | null;

};



export type Referee = {
  id: string;
  candidate_id: string;
  name: string;                    // ✅ matches DB column
  email: string;
  mobile?: string | null;
  relationship?: string | null;
  created_by?: string | null;
  company_id?: string | null;
  type?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  email_sent?: boolean | null;
  token?: string | null;
  email_sent_at?: string | null;
  response_received_at?: string | null;
  declined_reason?: string | null;
  notes?: string | null;
  email_status?: "pending" | "sent" | "delivered" | "bounced";
  is_archived?: boolean;
  archived_at?: string | null;

};

export type RefereeWithRequest = Referee & {
  reference_responses?: { status: string }[];
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

export interface RefTypeOption {
  label: string;
  key: string;
}
