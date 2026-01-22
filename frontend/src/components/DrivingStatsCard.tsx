import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

// --- TYPY DANYCH ---

interface StatsDetails {
  total_readings: number;
  total_harsh: number;
  avg_harsh_per_day: number;
  total_crashes: number;
}

interface DrivingStatsData {
  score: number;
  interpretation: string;
  period_days: number;
  stats: StatsDetails;
}

interface ApiResponse {
  success: boolean;
  data: DrivingStatsData;
  error?: string;
}

// --- PROPSY ---

interface DrivingStatsCardProps {
  macAddress: string;
  token: string | null;
}

// --- KOMPONENT ---

const DrivingStatsCard: React.FC<DrivingStatsCardProps> = ({ macAddress, token }) => {
  const [stats, setStats] = useState<DrivingStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Zamiast error stringa, używamy flagi do zmiany stylu na "neutralny"
  const [isError, setIsError] = useState<boolean>(false);

  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchStats = useCallback(async () => {
    if (!macAddress || !token) return;

    setLoading(true);
    setIsError(false);

    try {
      const params = new URLSearchParams({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });

      const response = await apiFetch(`/stats/${macAddress}/acceleration?${params.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setStats(result.data);

    } catch (err) {
      console.error("DrivingStats silent error:", err); // Logujemy tylko w konsoli dla developera
      setIsError(true);
      
      // Ustawiamy puste dane, żeby karta się wyświetliła (fallback)
      setStats({
        score: 0,
        interpretation: "Dane niedostępne",
        period_days: 0,
        stats: {
            total_readings: 0,
            total_harsh: 0,
            avg_harsh_per_day: 0,
            total_crashes: 0
        }
      });
    } finally {
      setLoading(false);
    }
  }, [macAddress, token, dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Logika kolorów: Jeśli jest błąd lub brak odczytów -> szary (neutral)
  const getScoreClass = (score: number): string => {
    if (isError || (stats?.stats.total_readings === 0)) return 'neutral'; 
    if (score >= 90) return 'good';
    if (score >= 70) return 'average';
    return 'bad';
  };

  // --- RENDEROWANIE ---

  if (loading && !stats) return <div className="loading-state">Analizowanie stylu jazdy...</div>;
  
  // Jeśli stats jest null (np. pierwszy render), nic nie pokazujemy
  if (!stats) return null;

  return (
    <div className="driver-card">
      
      <div className="card-header">
        <h3>Ocena Stylu Jazdy</h3>
      </div>

      <div className="score-section">
        {/* Kółko z wynikiem */}
        <div className={`score-circle ${getScoreClass(stats.score)}`}>
          <span className="score-value">
            {isError ? "?" : stats.score}
          </span>
          <span className="score-max">/ 100</span>
        </div>

        <div className="score-info">
          <h4 style={{ color: isError ? '#9ca3af' : 'inherit' }}>
            {stats.interpretation}
          </h4>
          <p>
            {isError ? (
                <span>Nie udało się pobrać danych z serwera.</span>
            ) : (
                <>
                 Raport z <strong>{stats.period_days} dni</strong>.<br/>
                 Przeanalizowano {stats.stats.total_readings} próbek.
                </>
            )}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box harsh">
          <span className="stat-label">Ostre Manewry</span>
          <div className="stat-value">
            {isError ? "-" : stats.stats.total_harsh}
          </div>
          <div className="stat-sub">
            {isError ? "Brak danych" : `śr. ${stats.stats.avg_harsh_per_day} / dzień`}
          </div>
        </div>

        <div className={`stat-box crash ${stats.stats.total_crashes > 0 ? 'danger' : ''}`}>
          <span className="stat-label">Wykryte Kolizje</span>
          <div className="stat-value">
            {isError ? "-" : stats.stats.total_crashes}
          </div>
          <div className="stat-sub">Zdarzenia krytyczne</div>
        </div>
      </div>

      <div className="controls">
        <span>Zakres:</span>
        <input 
          type="date" 
          className="date-input"
          value={dateRange.startDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange({...dateRange, startDate: e.target.value})}
        />
        <span>-</span>
        <input 
          type="date" 
          className="date-input"
          value={dateRange.endDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange({...dateRange, endDate: e.target.value})}
        />
        
        <button 
          className="refresh-btn" 
          onClick={fetchStats} 
          disabled={loading}
          style={isError ? { backgroundColor: '#ef4444' } : {}}
        >
          {loading ? '...' : (isError ? 'Ponów' : 'Odśwież')}
        </button>
      </div>

    </div>
  );
};

export default DrivingStatsCard;