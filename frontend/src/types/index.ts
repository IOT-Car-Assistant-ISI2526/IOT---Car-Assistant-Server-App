export interface User {
  username: string;
}

export interface Device {
  mac_address: string;
  friendly_name?: string;
}

export interface Measurement {
  id?: number;
  sensor_type: string;
  value: number;
  timestamp: number;
}

export interface AuthResponse {
  access_token: string;
  username: string;
  error?: string;
}

export interface EngineStats {
  avg_temp: number;
  max_temp: number;
  is_overheating: boolean;
}

export interface SafetyStats {
  score: number | null; 
  harsh_events: number;
  extreme_shocks: number;
}

export interface DashboardStatsData {
  engine: EngineStats;
  safety: SafetyStats;
  total_measurements: number;
}