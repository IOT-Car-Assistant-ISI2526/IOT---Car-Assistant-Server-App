import { useMemo, useState } from 'react';
import { type Measurement } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Rejestracja modułów Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  measurements: Measurement[];
}

export const SensorChart = ({ measurements }: Props) => {
  if (measurements.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Brak danych pomiarowych.</div>;
  }

  // Grupowanie danych
  const groupedData = useMemo(() => {
    const groups: Record<string, Measurement[]> = {};
    measurements.forEach(m => {
      if (!groups[m.sensor_type]) groups[m.sensor_type] = [];
      groups[m.sensor_type].push(m);
    });
    // Sortowanie po czasie (najstarsze pierwsze dla wykresu)
    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => a.timestamp - b.timestamp);
    });
    return groups;
  }, [measurements]);

  const sensorTypes = Object.keys(groupedData);
  const [activeSensor, setActiveSensor] = useState<string>(sensorTypes[0] || '');

  // Aktualizacja aktywnego sensora, jeśli zmieniły się dane
  if (!sensorTypes.includes(activeSensor) && sensorTypes.length > 0) {
      setActiveSensor(sensorTypes[0]);
  }

  const chartData = {
    labels: groupedData[activeSensor]?.map(m => new Date(m.timestamp * 1000).toLocaleTimeString('pl-PL')) || [],
    datasets: [
      {
        label: `Sensor: ${activeSensor}`,
        data: groupedData[activeSensor]?.map(m => m.value) || [],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div>
      <div className="sensor-tabs-container" id="sensorTabs">
        {sensorTypes.map(type => (
          <button
            key={type}
            className={`sensor-tab ${activeSensor === type ? 'active' : ''}`}
            onClick={() => setActiveSensor(type)}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', height: '350px', width: '100%' }}>
        <Line 
            options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { x: { ticks: { maxTicksLimit: 8 } } }
            }} 
            data={chartData} 
        />
      </div>
    </div>
  );
};