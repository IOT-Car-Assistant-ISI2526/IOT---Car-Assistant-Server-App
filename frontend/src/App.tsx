import { useEffect, useState } from 'react';
import { apiFetch } from './api/client';
import { AuthForm } from './components/AuthForm';
import { SensorChart } from './components/SensorChart';
import { DeleteModal } from './components/DeleteModal';
import { Settings } from './components/Settings';
import { ConfirmModal } from './components/ConfirmModal'; // <--- IMPORTUJEMY TUTAJ
import { type AuthResponse, type Device, type Measurement } from './types';

type ViewState = 'dashboard' | 'settings';

function App() {
  // Stan Autoryzacji
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));

  // Stan UI
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // --- NOWY STAN DLA POTWIERDZENIA WYLOGOWANIA ---
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Stan Danych
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  
  // --- Efekty ---
  useEffect(() => {
    if (token) loadDevices();
  }, [token]);

  useEffect(() => {
    if (currentView === 'dashboard' && selectedDevice) {
      loadMeasurements(selectedDevice.mac_address);
    }
  }, [selectedDevice, currentView]);

  // --- Funkcje Logiki ---
  const handleLoginSuccess = (data: AuthResponse) => {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('username', data.username);
    setToken(data.access_token);
    setUsername(data.username);
  };

  // 1. Zmieniamy nazwę starej funkcji na performLogout (wykonaj wylogowanie)
  const performLogout = () => {
    localStorage.clear();
    setToken(null);
    setUsername(null);
    setSelectedDevice(null);
    setCurrentView('dashboard');
    setIsLogoutConfirmOpen(false); // Zamykamy modal
  };

  // 2. Nowa funkcja podpięta pod przycisk - tylko otwiera modal
  const handleLogoutClick = () => {
    setIsLogoutConfirmOpen(true);
  };

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await apiFetch('/devices/');
      const data = await res.json();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadMeasurements = async (mac: string) => {
    try {
      const res = await apiFetch(`/devices/${mac}/measurements?limit=100`);
      const data = await res.json();
      setMeasurements(data.measurements || []);
    } catch (e) {
      console.error("Failed to load measurements", e);
    }
  };

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return;
    try {
      const res = await apiFetch(`/devices/${selectedDevice.mac_address}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Urządzenie usunięte');
        setIsDeleteModalOpen(false);
        setSelectedDevice(null);
        loadDevices();
      }
    } catch (e) {
      alert('Błąd podczas usuwania');
    }
  };

  // --- Renderowanie ---
  if (!token) {
    return <AuthForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#2563eb' }}>IOT System</div>
          
          <nav style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={currentView === 'dashboard' ? 'secondary' : ''}
              style={{ 
                background: currentView === 'dashboard' ? '#2563eb' : 'transparent', 
                color: currentView === 'dashboard' ? 'white' : 'var(--text-muted)',
                width: 'auto', padding: '8px 16px', marginTop: 0
              }}
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={currentView === 'settings' ? 'secondary' : ''}
              style={{ 
                background: currentView === 'settings' ? '#2563eb' : 'transparent',
                color: currentView === 'settings' ? 'white' : 'var(--text-muted)', 
                width: 'auto', padding: '8px 16px', marginTop: 0
              }}
              onClick={() => setCurrentView('settings')}
            >
              Ustawienia
            </button>
          </nav>
        </div>

        <div>
          <span style={{ marginRight: 15, fontWeight: 500 }}>{username}</span>
          {/* 3. Podpinamy nową funkcję handleLogoutClick */}
          <button 
            onClick={handleLogoutClick} 
            className="secondary" 
            style={{ width: 'auto', padding: '8px 20px', marginTop: 0 }}
          >
            Wyloguj
          </button>
        </div>
      </header>

      {/* --- ZAWARTOŚĆ GŁÓWNA (bez zmian) --- */}
      {currentView === 'settings' ? (
        <Settings onDeviceAdded={loadDevices} />
      ) : (
        <div className="container dashboard-grid">
           {/* ... reszta kodu dashboardu bez zmian ... */}
           {/* Skróciłem ten fragment dla czytelności, tutaj jest Twój Dashboard */}
           <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h3>Moje Urządzenia</h3>
                <button onClick={loadDevices} className="secondary" style={{ width: 'auto', padding: '5px 12px', marginTop: 0 }}>↻</button>
              </div>
              <div id="devicesList">
                {loadingDevices ? <p style={{textAlign: 'center'}}>Ładowanie...</p> : (
                  devices.length === 0 ? <p style={{textAlign: 'center'}}>Brak urządzeń. Przejdź do ustawień, aby dodać.</p> : 
                  devices.map(dev => (
                    <div 
                      key={dev.mac_address}
                      className={`device-item ${selectedDevice?.mac_address === dev.mac_address ? 'selected' : ''}`}
                      onClick={() => setSelectedDevice(dev)}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{dev.friendly_name || 'Urządzenie IOT'}</div>
                      <div style={{ fontSize: '0.9em', color: '#666' }}>{dev.mac_address}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            {selectedDevice ? (
              <>
                <div className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedDevice.friendly_name || "Urządzenie"}</h2>
                      <p style={{ color: 'var(--text-muted)', margin: '5px 0' }}>MAC: {selectedDevice.mac_address}</p>
                    </div>
                    <button 
                      className="danger" 
                      style={{ width: 'auto', marginTop: 0 }} 
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      Usuń urządzenie
                    </button>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <h3>Wykresy Pomiary</h3>
                    <button 
                      className="secondary" 
                      style={{ width: 'auto', marginTop: 0 }}
                      onClick={() => loadMeasurements(selectedDevice.mac_address)}
                    >
                      Odśwież
                    </button>
                  </div>
                  <SensorChart measurements={measurements} />
                </div>
              </>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: '3rem', marginBottom: 20 }}>👈</div>
                <h3>Wybierz urządzenie z listy</h3>
                <p style={{ color: 'var(--text-muted)' }}>Kliknij na kafelek, aby zobaczyć historię pomiarów.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODALE --- */}
      
      {/* Modal usuwania urządzenia */}
      {selectedDevice && (
        <DeleteModal 
          isOpen={isDeleteModalOpen}
          deviceMac={selectedDevice.mac_address}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteDevice}
        />
      )}

      {/* 4. Dodajemy Modal Wylogowania */}
      <ConfirmModal 
        isOpen={isLogoutConfirmOpen}
        title="Wylogowanie"
        message="Czy na pewno chcesz się wylogować z systemu?"
        confirmLabel="Wyloguj"
        onConfirm={performLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </div>
  );
}

export default App;