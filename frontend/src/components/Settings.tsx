import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { DeleteModal } from './DeleteModal';
import { type Device } from '../types';

interface Props {
  onDeviceAdded: () => void; // Nazwa propsa została dla kompatybilności (odświeża menu)
}

export const Settings = ({ onDeviceAdded }: Props) => {
  // --- STATE: LISTA I USUWANIE ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [status, setStatus] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  // --- STATE: EDYCJA NAZWY ---
  const [editingMac, setEditingMac] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // 1. Pobieranie listy urządzeń
  const fetchDevices = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch('/devices/');
      const data = await res.json();
      setDevices(data);
    } catch (e) {
      console.error("Błąd pobierania listy", e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // 2. Obsługa Usuwania (DELETE)
  const confirmDelete = async () => {
    if (!deviceToDelete) return;
    try {
      const res = await apiFetch(`/devices/${deviceToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        setDeviceToDelete(null);
        fetchDevices();
        onDeviceAdded(); // Odśwież widok w rodzicu
        setStatus({ msg: 'Urządzenie usunięte.', type: 'success' });
        setTimeout(() => setStatus(null), 3000);
      } else {
        alert('Nie udało się usunąć urządzenia.');
      }
    } catch (e) {
      alert('Błąd serwera.');
    }
  };

  // 3. OBSŁUGA EDYCJI NAZWY
  const startEditing = (device: Device) => {
    setEditingMac(device.mac_address);
    setTempName(device.friendly_name || '');
  };

  const cancelEditing = () => {
    setEditingMac(null);
    setTempName('');
  };

  const handleUpdateName = async (mac: string) => {
    try {
      const res = await apiFetch(`/devices/${mac}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendly_name: tempName })
      });

      if (res.ok) {
        await fetchDevices();
        onDeviceAdded();
        setEditingMac(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Błąd aktualizacji nazwy');
      }
    } catch (e) {
      alert('Błąd połączenia z serwerem');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '20px' }}>Ustawienia Systemu</h2>

      {status && (
        <div className={`status-msg ${status.type}`} style={{ marginBottom: '20px' }}>
          {status.msg}
        </div>
      )}

      {/* --- LISTA I ZARZĄDZANIE --- */}
      <div className="card">
        <h3>Moje Urządzenia:</h3>

        {loadingList ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Ładowanie listy...</div>
        ) : devices.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed #ccc', borderRadius: '8px' }}>
            Brak przypisanych urządzeń.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devices.map((device) => {
              const isEditing = editingMac === device.mac_address;

              return (
                <div 
                  key={device.mac_address} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '15px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    gap: '15px'
                  }}
                >
                  {/* LEWA STRONA: Nazwa i MAC */}
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      // TRYB EDYCJI
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          placeholder="Wpisz nazwę..."
                          style={{ margin: 0, padding: '6px' }}
                          autoFocus
                        />
                        <button 
                          onClick={() => handleUpdateName(device.mac_address)}
                          style={{ width: 'auto', margin: 0, padding: '6px 12px', fontSize: '0.85em', background: '#10b981' }}
                        >
                          Zapisz
                        </button>
                        <button 
                          onClick={cancelEditing}
                          style={{ width: 'auto', margin: 0, padding: '6px 12px', fontSize: '0.85em', background: '#9ca3af' }}
                        >
                          Anuluj
                        </button>
                      </div>
                    ) : (
                      // TRYB PODGLĄDU
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.05em' }}>
                            {device.friendly_name || 'Urządzenie bez nazwy'}
                          </span>
                          <button 
                            className="secondary"
                            onClick={() => startEditing(device)}
                            style={{ 
                              width: 'auto', margin: 0, padding: '2px 8px', fontSize: '0.75em', height: 'auto' 
                            }}
                          >
                            ✏️ Edytuj
                          </button>
                        </div>
                        <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.9em', marginTop: '4px' }}>
                          {device.mac_address}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRAWA STRONA: Przycisk Usuń */}
                  <button 
                    className="danger" 
                    style={{ width: 'auto', marginTop: 0, padding: '8px 16px', fontSize: '0.85em' }}
                    onClick={() => setDeviceToDelete(device.mac_address)}
                  >
                    Usuń
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeleteModal 
        isOpen={!!deviceToDelete}
        deviceMac={deviceToDelete || ''}
        onClose={() => setDeviceToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};