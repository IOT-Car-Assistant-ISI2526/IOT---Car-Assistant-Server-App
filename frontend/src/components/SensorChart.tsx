import { useMemo, useState, useEffect } from 'react';
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
  Filler,
  TimeScale,
  type ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { pl } from 'date-fns/locale';

const SENSOR_LABELS: Record<string, string> = {
  'adxl': 'Przyspieszenie',
  'max_normal': 'Temperatura silnika',
  'max_profile': 'Temperatura silnika profile'
};

// Funkcja pomocnicza, która tłumaczy nazwę
const getSensorLabel = (type: string | undefined) => {
  if (!type) return 'Nieznany czujnik';
  // Pobieramy ładną nazwę lub zwracamy oryginał (np. ADXL) powiększony, jeśli nie ma w słowniku
  return SENSOR_LABELS[type.toLowerCase()] || type.toUpperCase();
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

interface Props {
  measurements: Measurement[];
}

export const SensorChart = ({ measurements }: Props) => {
  if (measurements.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Brak danych.</div>;
  }

  const groupedData = useMemo(() => {
    const groups: Record<string, Measurement[]> = {};
    measurements.forEach(m => {
      if (!groups[m.sensor_type]) groups[m.sensor_type] = [];
      groups[m.sensor_type].push(m);
    });
    
    // Sortowanie chronologiczne
    Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });
    return groups;
  }, [measurements]);

  const sensorTypes = Object.keys(groupedData);
  const [activeSensor, setActiveSensor] = useState<string>(sensorTypes[0] || '');

  // Aktualizacja aktywnego sensora przy zmianie danych
  useEffect(() => {
    if (!sensorTypes.includes(activeSensor) && sensorTypes.length > 0) {
      setActiveSensor(sensorTypes[0]);
    }
  }, [sensorTypes, activeSensor]);

  const currentData = groupedData[activeSensor] || [];

  // Funkcja do określania etykiety osi Y na podstawie nazwy sensora
  const getYAxisLabel = (sensorName: string) => {
    if (sensorName.includes('max')) return 'Temperatura (°C)';
    if (sensorName.includes('adxl')) return 'Przyspieszenie (m²)';
    return 'Wartość';
  };

  const chartData = {
    datasets: [
      {
        label: `Sensor: ${activeSensor}`,
        data: currentData.map(m => ({
          x: m.timestamp,
          y: m.value
        })),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.2,
        fill: true,
        pointRadius: 2,
        segment: {
            // Opcjonalnie: przerywanie linii przy długich przerwach (np. > 24h)
            borderColor: (ctx: any) => {
                if (!ctx.p0.parsed || !ctx.p1.parsed) return undefined;
                const delta = ctx.p1.parsed.x - ctx.p0.parsed.x;
                if (delta > 86400000) return 'transparent';
                return undefined;
            }
        }
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          // Chart.js sam dobierze jednostkę, ale formatujemy wyświetlanie
          displayFormats: {
            hour: 'HH:mm',     // Format godziny: 14:30
            day: 'dd MMM'      // Format dnia: 22 Lut
          },
          tooltipFormat: 'dd MMM HH:mm',
        },
        adapters: {
          date: { locale: pl }
        },
        ticks: {
          source: 'auto',
          maxRotation: 0,
          autoSkip: true,
        },
        // --- TYTUŁ OSI X ---
        title: {
          display: true,
          text: 'Godzina / Data',
          color: '#666',
          font: {
            weight: 'bold'
          }
        }
      },
      y: {
        beginAtZero: false,
        // --- TYTUŁ OSI Y ---
        title: {
          display: true,
          text: getYAxisLabel(activeSensor), // Dynamiczny tekst
          color: '#666',
          font: {
            weight: 'bold'
          }
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  
  
  return (
    <div>
      <div className="sensor-tabs-container" id="sensorTabs" style={{ display: 'flex', gap: '10px', marginBottom: '10px', overflowX: 'auto' }}>
        {sensorTypes.map(type => (
          <button
            key={type}
            className={`sensor-tab ${activeSensor === type ? 'active' : ''}`}
            onClick={() => setActiveSensor(type)}
            style={{ 
                padding: '5px 15px', 
                borderRadius: '15px', 
                border: '1px solid #ddd',
                background: activeSensor === type ? '#2563eb' : '#fff',
                color: activeSensor === type ? '#fff' : '#333',
                cursor: 'pointer'
            }}
          >
            {getSensorLabel(type)}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', height: '350px', width: '100%' }}>
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
};