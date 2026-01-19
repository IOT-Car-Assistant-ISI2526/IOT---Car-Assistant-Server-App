const API_BASE_URL = 'http://localhost:5000/api';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) } as HeadersInit;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('access_token');
    window.location.reload(); // Prosty sposób na wylogowanie przy wygasłym tokenie
    throw new Error('Unauthorized');
  }

  return response;
};