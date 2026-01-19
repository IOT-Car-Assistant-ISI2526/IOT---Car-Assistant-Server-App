import { useState } from 'react';
import { apiFetch } from '../api/client';
import { type AuthResponse } from '../types';

interface Props {
  onLoginSuccess: (data: AuthResponse) => void;
}

export const AuthForm = ({ onLoginSuccess }: Props) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', confirm: '' });
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      if (!isLogin && formData.password !== formData.confirm) {
        throw new Error('Hasła nie są identyczne!');
      }

      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = { username: formData.username, password: formData.password };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Błąd autoryzacji');

      if (isLogin) {
        onLoginSuccess(data);
      } else {
        setMessage({ text: 'Konto utworzone! Zaloguj się.', type: 'success' });
        setIsLogin(true);
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="container">
      <div className="auth-container">
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>IOT Dashboard</h2>
        <div className="auth-tabs">
          <button className={`tab-btn ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Logowanie</button>
          <button className={`tab-btn ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Rejestracja</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <input 
            type="text" 
            placeholder="Nazwa użytkownika" 
            value={formData.username}
            onChange={e => setFormData({...formData, username: e.target.value})}
            required 
          />
          <input 
            type="password" 
            placeholder="Hasło" 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required 
          />
          {!isLogin && (
            <input 
              type="password" 
              placeholder="Powtórz hasło" 
              value={formData.confirm}
              onChange={e => setFormData({...formData, confirm: e.target.value})}
              required 
            />
          )}
          <button type="submit">{isLogin ? 'Zaloguj się' : 'Zarejestruj się'}</button>
        </form>

        {message && (
          <div className={`status-msg ${message.type}`}>{message.text}</div>
        )}
      </div>
    </div>
  );
};