import { useEffect, useState } from 'react';
import { apiFetch } from './api/client';
import { AuthForm } from './components/AuthForm';
import { SensorChart } from './components/SensorChart';
import { DeleteModal } from './components/DeleteModal';
import { Settings } from './components/Settings';
import { ConfirmModal } from './components/ConfirmModal';
import EngineTempCard from './components/EngineTempCard';
import DrivingStatsCard from './components/DrivingStatsCard';
// Jeśli utworzyłeś TrendsCard w poprzednich krokach, odkomentuj import:
import { type AuthResponse, type Device, type Measurement } from './types';

type ViewState = 'dashboard' | 'settings';

// Funkcja pomocnicza do formatu YYYY-MM-DDTHH:mm
const getLocalISOString = (daysOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysOffset);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function App() {
  // --- AUTH & VIEW ---
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // --- DATA STATES ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  
  // --- FILTERS ---
  const [startDate, setStartDate] = useState(getLocalISOString(1));
  const [endDate, setEndDate] = useState(getLocalISOString(0));

  // --- UI STATES ---
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    if (token) loadDevices();
  }, [token]);

  useEffect(() => {
    if (currentView === 'dashboard' && selectedDevice) {
      loadMeasurements(selectedDevice.mac_address);
    }
  }, [selectedDevice, currentView]);

  // --- ACTIONS ---
  const handleLoginSuccess = (data: AuthResponse) => {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('username', data.username);
    setToken(data.access_token);
    setUsername(data.username);
  };

  const performLogout = () => {
    localStorage.clear();
    setToken(null);
    setUsername(null);
    setSelectedDevice(null);
    setCurrentView('dashboard');
    setIsLogoutConfirmOpen(false);
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
    setLoadingMeasurements(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await apiFetch(`/devices/${mac}/measurements?${params.toString()}`);
      if (!res.ok) throw new Error('Błąd pobierania');
      const data = await res.json();
      setMeasurements(data.measurements || []);
    } catch (e) {
      console.error("Failed to load measurements", e);
      setMeasurements([]);
    } finally {
      setLoadingMeasurements(false);
    }
  };

  const handleClaimDevice = () => loadDevices();

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
      alert('Błąd usuwania');
    }
  };

  if (!token) return <AuthForm onLoginSuccess={handleLoginSuccess} />;

  return (
    <div>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#2563eb' }}>IOT System</div>
          <nav style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={currentView === 'dashboard' ? 'secondary' : ''}
              style={{ background: currentView === 'dashboard' ? '#2563eb' : 'transparent', color: currentView === 'dashboard' ? 'white' : 'var(--text-muted)', width: 'auto', padding: '8px 16px', marginTop: 0 }}
              onClick={() => setCurrentView('dashboard')}
            >
              Strona Głowna
            </button>
            <button 
              className={currentView === 'settings' ? 'secondary' : ''}
              style={{ background: currentView === 'settings' ? '#2563eb' : 'transparent', color: currentView === 'settings' ? 'white' : 'var(--text-muted)', width: 'auto', padding: '8px 16px', marginTop: 0 }}
              onClick={() => setCurrentView('settings')}
            >
              Ustawienia
            </button>
          </nav>
        </div>
        <div>
          <span style={{ marginRight: 15, fontWeight: 500 }}>{username}</span>
          <button onClick={() => setIsLogoutConfirmOpen(true)} className="secondary" style={{ width: 'auto', padding: '8px 20px', marginTop: 0 }}>Wyloguj</button>
        </div>
      </header>

      {currentView === 'settings' ? (
        <Settings onDeviceAdded={handleClaimDevice} />
      ) : (
        <div className="container dashboard-container">
          
          {/* --- 1. GÓRNY PASEK URZĄDZEŃ --- */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Wybierz pojazd:</h3>
            
            {loadingDevices ? <p style={{color: 'var(--text-muted)'}}>Ładowanie listy...</p> : (
              <div className="device-bar">
                {devices.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Brak urządzeń. Przejdź do ustawień.</p> : 
                  devices.map(dev => (
                    <div 
                      key={dev.mac_address}
                      className={`device-chip ${selectedDevice?.mac_address === dev.mac_address ? 'active' : ''}`}
                      onClick={() => setSelectedDevice(dev)}
                    >
                      <span className="name" title={dev.friendly_name || ''}>{dev.friendly_name || 'Bez nazwy'}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* --- GŁÓWNA ZAWARTOŚĆ --- */}
          {selectedDevice ? (
            <>
              {/* --- 2. WIERSZ ZE STATYSTYKAMI (KARTY) --- */}
              <div className="stats-row">
                <DrivingStatsCard 
                  macAddress={selectedDevice.mac_address}
                  token={token} 
                />
                
                <EngineTempCard 
                  macAddress={selectedDevice.mac_address} 
                  token={token} 
                />
              </div>

              {/* --- 3. SEKCJA WYKRESÓW --- */}
              <div className="charts-section">
                

                {/* Wykres Surowych Danych */}
                <div className="card">
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                      <h3 style={{ margin: 0 }}>Szczegółowe Pomiary</h3>
                      
                      {/* Filtry daty */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="datetime-local" 
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          style={{ margin: 0, padding: '6px', fontSize: '0.85rem', width: 'auto' }}
                        />
                        <span style={{ fontWeight: 'bold' }}>-</span>
                        <input 
                          type="datetime-local" 
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          style={{ margin: 0, padding: '6px', fontSize: '0.85rem', width: 'auto' }}
                        />
                        <button 
                          onClick={() => loadMeasurements(selectedDevice.mac_address)}
                          disabled={loadingMeasurements}
                          style={{ width: 'auto', marginTop: 0, padding: '6px 12px' }}
                        >
                          {loadingMeasurements ? '...' : 'Pokaż'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {loadingMeasurements ? (
                    <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                      Ładowanie danych...
                    </div>
                  ) : (
                    <SensorChart measurements={measurements} />
                  )}
                </div>
              </div>
            </>
          ) : (
            // --- STAN PUSTY (BRAK WYBORU) ---
            <div className="card" style={{ textAlign: 'center', padding: 80, marginTop: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 20 }}>👆</div>
              <h3>Wybierz pojazd z paska powyżej</h3>
              <p style={{ color: 'var(--text-muted)' }}>Kliknij na kafelek urządzenia, aby zobaczyć statystyki</p>
            </div>
          )}
        </div>
      )}

      {/* --- MODALE --- */}
      {selectedDevice && (
        <DeleteModal 
          isOpen={isDeleteModalOpen}
          deviceMac={selectedDevice.mac_address}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteDevice}
        />
      )}
      
      <ConfirmModal 
        isOpen={isLogoutConfirmOpen}
        title="Wylogowanie"
        message="Czy na pewno chcesz się wylogować?"
        onConfirm={performLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </div>
  );
}

export default App;