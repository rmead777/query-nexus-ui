
export interface ApiEndpoint {
  id: string;
  name: string;
  api_endpoint: string | null;
  api_key: string | null;
  model: string | null;
  provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
}
