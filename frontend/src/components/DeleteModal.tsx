import { useState } from 'react';

interface Props {
  deviceMac: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteModal = ({ deviceMac, isOpen, onClose, onConfirm }: Props) => {
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}> {/* Override styles class logic */}
      <div className="modal-content">
        <h3 style={{ color: 'var(--danger)', marginTop: 0 }}>⚠️ Strefa Niebezpieczna</h3>
        <p>Czy na pewno chcesz usunąć urządzenie <b>{deviceMac}</b>?</p>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: 20 }}>
          Aby potwierdzić, wpisz poniżej pełny adres MAC.
        </p>
        
        <input 
          type="text" 
          placeholder="Wpisz adres MAC tutaj" 
          style={{ textAlign: 'center', fontWeight: 'bold' }}
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} className="secondary">Anuluj</button>
          <button 
            onClick={onConfirm} 
            className="danger" 
            disabled={confirmInput !== deviceMac}
          >
            🗑️ Usuń urządzenie
          </button>
        </div>
      </div>
    </div>
  );
};