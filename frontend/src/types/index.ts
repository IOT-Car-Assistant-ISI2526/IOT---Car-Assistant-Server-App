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