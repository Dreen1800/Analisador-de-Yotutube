import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  Filler,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { TrendingUp, Info, Eye, Clock } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Video {
  video_id: string;
  title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds: number;
  published_at: string;
}

interface ViewsDurationChartProps {
  videos: Video[];
}

const ViewsDurationChart = ({ videos }: ViewsDurationChartProps) => {
  const [chartData, setChartData] = useState({
    datasets: [] as any[],
  });
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (videos.length > 0) {
      // Preparar pontos de dados
      const dataPoints = videos.map(video => ({
        x: video.duration_seconds / 60, // Converter para minutos
        y: video.view_count,
        id: video.video_id,
        title: video.title,
        duration: video.duration_seconds,
        views: video.view_count,
        likes: video.like_count,
        comments: video.comment_count,
      }));
      
      // Calcular tendência linear (regressão)
      if (dataPoints.length > 1) {
        // Calcular média de x e y
        const xSum = dataPoints.reduce((sum, point) => sum + point.x, 0);
        const ySum = dataPoints.reduce((sum, point) => sum + point.y, 0);
        const xMean = xSum / dataPoints.length;
        const yMean = ySum / dataPoints.length;
        
        // Calcular coeficientes para y = mx + b
        let numerator = 0;
        let denominator = 0;
        
        for (const point of dataPoints) {
          numerator += (point.x - xMean) * (point.y - yMean);
          denominator += (point.x - xMean) * (point.x - xMean);
        }
        
        const m = denominator !== 0 ? numerator / denominator : 0;
        const b = yMean - m * xMean;
        
        // Criar pontos para a linha de tendência
        const minX = Math.min(...dataPoints.map(point => point.x));
        const maxX = Math.max(...dataPoints.map(point => point.x));
        
        const trendlinePoints = [
          { x: minX, y: m * minX + b },
          { x: maxX, y: m * maxX + b }
        ];
        
        setChartData({
          datasets: [
            {
              label: 'Vídeos',
              data: dataPoints,
              backgroundColor: 'rgba(99, 102, 241, 0.7)',
              borderColor: 'rgba(99, 102, 241, 1)',
              pointRadius: 6,
              pointHoverRadius: 8,
            },
            {
              label: 'Linha de Tendência',
              data: trendlinePoints,
              type: 'line',
              borderColor: 'rgba(220, 38, 38, 0.7)',
              borderWidth: 2,
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false,
              tension: 0,
            }
          ],
        });
      } else {
        setChartData({
          datasets: [
            {
              label: 'Vídeos',
              data: dataPoints,
              backgroundColor: 'rgba(99, 102, 241, 0.7)',
              borderColor: 'rgba(99, 102, 241, 1)',
              pointRadius: 6,
              pointHoverRadius: 8,
            }
          ],
        });
      }
    }
  }, [videos]);

  // Formatar números grandes
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + ' mi';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + ' mil';
    } else {
      return num.toString();
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 12
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        padding: 12,
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 12
        },
        titleFont: {
          family: "'Inter', sans-serif", 
          size: 14,
          weight: 'bold'
        },
        callbacks: {
          title: (tooltipItems: any) => {
            return tooltipItems[0].raw.title || '';
          },
          label: (context: any) => {
            const { raw } = context;
            
            if (!raw) return '';
            
            const durationMinutes = Math.floor(raw.duration / 60);
            const durationSeconds = raw.duration % 60;
            
            return [
              `Duração: ${durationMinutes}m ${durationSeconds}s`,
              `Visualizações: ${formatNumber(raw.views)}`,
              `Curtidas: ${formatNumber(raw.likes)}`,
              `Comentários: ${formatNumber(raw.comments)}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Visualizações',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 'medium'
          }
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.5)'
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          callback: (value: number) => {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + ' mi';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + ' mil';
            }
            return value;
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Duração (minutos)',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 'medium'
          }
        },
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  const getCorrelationStrength = () => {
    if (videos.length <= 1) return 'Insuficiente';
    
    // Calcular correlação
    const dataPoints = videos.map(video => ({
      x: video.duration_seconds / 60,
      y: video.view_count
    }));
    
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);
    
    const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    
    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;
    
    for (let i = 0; i < xValues.length; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }
    
    const correlation = numerator / (Math.sqrt(xDenominator) * Math.sqrt(yDenominator));
    
    // Classificar a força da correlação
    const absCorrelation = Math.abs(correlation);
    if (absCorrelation < 0.3) return 'Fraca';
    if (absCorrelation < 0.7) return 'Moderada';
    return 'Forte';
  };

  const getCorrelationColor = () => {
    const strength = getCorrelationStrength();
    if (strength === 'Forte') return 'text-green-600';
    if (strength === 'Moderada') return 'text-amber-600';
    if (strength === 'Fraca') return 'text-purple-600';
    return 'text-gray-600';
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Correlação Visualizações x Duração</h3>
        </div>
        <button 
          className="text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
          aria-label="Informações sobre o gráfico"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
      
      {showInfo && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-800">
          <p>
            Este gráfico mostra a relação entre a duração de cada vídeo e suas visualizações.
            A linha de tendência indica se vídeos mais longos ou mais curtos tendem a obter mais visualizações.
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
          <Eye className="w-4 h-4 text-purple-600 mr-2" />
          <div>
            <div className="text-xs text-gray-600">Média de visualizações</div>
            <div className="font-semibold">
              {videos.length > 0 
                ? formatNumber(videos.reduce((sum, v) => sum + v.view_count, 0) / videos.length) 
                : '0'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
          <Clock className="w-4 h-4 text-purple-600 mr-2" />
          <div>
            <div className="text-xs text-gray-600">Duração média</div>
            <div className="font-semibold">
              {videos.length > 0 
                ? Math.floor((videos.reduce((sum, v) => sum + v.duration_seconds, 0) / videos.length) / 60) + ' min' 
                : '0 min'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
          <div>
            <div className="text-xs text-gray-600">Correlação</div>
            <div className={`font-semibold ${getCorrelationColor()}`}>
              {getCorrelationStrength()}
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-72">
        <Scatter data={chartData} options={options} />
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        {videos.length > 0 
          ? `Baseado em ${videos.length} vídeos do canal`
          : 'Nenhum dado disponível para análise'}
      </div>
    </div>
  );
};

export default ViewsDurationChart;