import { useState } from 'react';
import { apiFetch } from '../api/client';

interface Props {
  onDeviceAdded: () => void; // Callback do odświeżenia listy w App
}

export const Settings = ({ onDeviceAdded }: Props) => {
  const [claimMac, setClaimMac] = useState('');
  const [status, setStatus] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClaimDevice = async () => {
    if (!claimMac.trim()) return;
    
    setIsSubmitting(true);
    setStatus(null);

    try {
      const res = await apiFetch('/devices/claim', {
        method: 'POST',
        body: JSON.stringify({ mac_address: claimMac })
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus({ msg: data.message, type: 'success' });
        setClaimMac('');
        onDeviceAdded(); // Sygnał dla rodzica, żeby odświeżył listę
      } else {
        setStatus({ msg: data.error || 'Błąd dodawania', type: 'error' });
      }
    } catch (e) {
      setStatus({ msg: 'Błąd połączenia z serwerem', type: 'error' });
    } finally {
      setIsSubmitting(false);
      // Ukryj komunikat po 5 sekundach
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '20px' }}>Ustawienia Systemu</h2>

      {/* Sekcja dodawania urządzenia */}
      <div className="card">
        <h3>➕ Dodaj nowe urządzenie</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: '15px' }}>
          Wpisz adres MAC urządzenia, które chcesz przypisać do swojego konta.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="np. AA:BB:CC:DD:EE:FF"
            value={claimMac}
            onChange={e => setClaimMac(e.target.value)}
            style={{ margin: 0 }}
          />
          <button 
            onClick={handleClaimDevice} 
            disabled={isSubmitting || !claimMac}
            style={{ width: 'auto', marginTop: 0, whiteSpace: 'nowrap' }}
          >
            {isSubmitting ? 'Dodawanie...' : 'Przypisz'}
          </button>
        </div>

        {status && (
          <div className={`status-msg ${status.type}`} style={{ marginTop: '15px' }}>
            {status.msg}
          </div>
        )}
      </div>

      {/* Miejsce na przyszłe ustawienia, np. zmiana hasła */}
      <div className="card" style={{ opacity: 0.7 }}>
        <h3>👤 Profil użytkownika</h3>
        <p style={{ color: 'var(--text-muted)' }}>Funkcja zmiany hasła będzie dostępna wkrótce.</p>
      </div>
    </div>
  );
};