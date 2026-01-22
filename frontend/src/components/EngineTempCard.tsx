import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

// --- TYPY DANYCH (zgodne z Twoim API) ---

interface TempStatsData {
  avg_temp: number;
  max_temp: number;
  total_readings: number;
  threshold_used: number | null;
}

interface ApiResponse {
  success: boolean;
  data: TempStatsData | null; // API może zwrócić null w data
  message?: string;
  error?: string;
}

// --- PROPSY ---

interface EngineTempCardProps {
  macAddress: string;
  token: string | null;
}

// --- KOMPONENT ---

export const EngineTempCard: React.FC<EngineTempCardProps> = ({ macAddress, token }) => {
  const [stats, setStats] = useState<TempStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Filtry
  const [threshold, setThreshold] = useState<number>(40); // Domyślnie ignorujemy poniżej 40st.
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = useCallback(async () => {
    if (!macAddress || !token) return;

    setLoading(true);
    setIsError(false);

    try {
      const params = new URLSearchParams({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        min_temp: threshold.toString() // Przekazujemy próg do API
      });

      const response = await apiFetch(`/stats/${macAddress}/engine_temp?${params.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      
      // Jeśli API zwróciło błąd logiczny
      if (result.error) throw new Error(result.error);

      // Jeśli success=true, ale data=null (brak wyników)
      setStats(result.data);

    } catch (err) {
      console.error("Temp fetch error:", err);
      setIsError(true);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [macAddress, token, dateRange, threshold]);

  useEffect(() => {
    fetchData();
  }, [macAddress, token]);

  // --- LOGIKA KOLORÓW (Dla Płynu Chłodniczego) ---
  const getTempColorClass = (avg: number | undefined): string => {
    if (avg === undefined || isError) return 'neutral';
    
    if (avg > 105) return 'bad';      // Przegrzanie
    if (avg > 95) return 'average';   // Trochę ciepło (stan ostrzegawczy)
    if (avg < 70) return 'average';   // Niedogrzany (lub krótka trasa)
    return 'good';                    // 70-95 to zazwyczaj optimum
  };

  const getStatusText = (avg: number | undefined): string => {
    if (avg === undefined || isError) return 'Brak danych';
    if (avg > 105) return 'KRYTYCZNA (Przegrzanie)';
    if (avg > 95) return 'WYSOKA';
    if (avg < 70) return 'NIEDOGRZENIE';
    return 'OPTYMALNA';
  };

  // --- RENDEROWANIE ---

  if (loading && !stats) return <div className="loading-state">Analiza temperatur...</div>;

  return (
    <div className="driver-card">
      
      {/* Nagłówek */}
      <div className="card-header">
        <h3>Analiza Temperatury Silnika</h3>
      </div>

      <div className="score-section">
        {/* Koło ze ŚREDNIĄ temperaturą */}
        <div className={`score-circle ${getTempColorClass(stats?.avg_temp)}`}>
          <span className="score-value">
            {stats ? stats.avg_temp : "--"}
          </span>
          <span className="score-max">°C (Średnia)</span>
        </div>

        <div className="score-info">
          <h4>{getStatusText(stats?.avg_temp)}</h4>
          <p>
            {isError || !stats ? (
              <span>Brak odczytów spełniających kryteria.</span>
            ) : (
              <>
                Analiza pracy silnika pod obciążeniem.<br/>
                Ignorowano odczyty poniżej <strong>{threshold}°C</strong>.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        {/* Box: Maksymalna Temperatura */}
        <div className={`stat-box ${stats && stats.max_temp > 105 ? 'crash danger' : 'crash'}`}>
          <span className="stat-label">Maksymalna Temp.</span>
          <div className="stat-value">
            {stats ? `${stats.max_temp}°C` : "-"}
          </div>
          <div className="stat-sub">
            {stats && stats.max_temp > 105 ? "⚠️ Wykryto przegrzanie!" : "Najwyższy odczyt"}
          </div>
        </div>

        {/* Box: Liczba próbek */}
        <div className="stat-box harsh">
          <span className="stat-label">Próbki pomiarowe</span>
          <div className="stat-value">
            {stats ? stats.total_readings : "-"}
          </div>
          <div className="stat-sub">ilość odczytów {">"} {threshold}°C</div>
        </div>
      </div>

      {/* Kontrolki */}
      <div className="controls">
        {/* Wybór dat */}
        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            <input 
            type="date" 
            className="date-input"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
            />
            <span style={{color: '#888'}}>-</span>
            <input 
            type="date" 
            className="date-input"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
            />
        </div>

        {/* Wybór progu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }}>
            <span style={{ fontSize: '0.85em', color: '#666' }}>Próg min:</span>
            <input 
                type="number" 
                className="date-input"
                style={{ width: '60px', padding: '6px' }}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
            />
            <span style={{ fontSize: '0.85em', color: '#666' }}>°C</span>
        </div>
        
        <button 
          className="refresh-btn" 
          onClick={fetchData} 
          disabled={loading}
        >
          {loading ? '...' : 'Odśwież'}
        </button>
      </div>

    </div>
  );
};

export default EngineTempCard;