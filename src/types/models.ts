export type Candidate = {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  created_at?: string;
  
};

export type Referee = {
  id: string;
  full_name: string;
  email: string;
  created_at?: string;
};

export type Request = {
  id: string;
  candidate_id: string;
  referee_id: string;
  status: string;
  resend_count?: number;
  created_at: string;
};
