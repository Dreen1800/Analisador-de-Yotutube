import { useEffect, useState } from 'react';
import '../lib/chartConfig'; // Importar configuração centralizada do Chart.js
import { Bar } from 'react-chartjs-2';
import { TrendingUp, Info } from 'lucide-react';

interface Video {
  video_id: string;
  title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  engagement_rate: number;
  published_at: string;
}

interface EngagementChartProps {
  videos: Video[];
}

const EngagementChart = ({ videos }: EngagementChartProps) => {
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[],
  });
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (videos.length > 0) {
      // Ordena os vídeos por taxa de engajamento (decrescente)
      const sortedVideos = [...videos]
        .sort((a, b) => b.engagement_rate - a.engagement_rate)
        .slice(0, 10); // Pega os top 10
      
      // Prepara os dados
      const labels = sortedVideos.map(video => {
        // Trunca o título se for muito longo
        return video.title.length > 20 
          ? video.title.substring(0, 20) + '...' 
          : video.title;
      });
      
      const engagementRates = sortedVideos.map(video => 
        parseFloat((video.engagement_rate * 100).toFixed(2))
      );
      
      setChartData({
        labels,
        datasets: [
          {
            label: 'Taxa de Engajamento (%)',
            data: engagementRates,
            backgroundColor: [
              'rgba(59, 130, 246, 0.7)',
              'rgba(99, 102, 241, 0.7)',
              'rgba(139, 92, 246, 0.7)',
              'rgba(168, 85, 247, 0.7)',
              'rgba(217, 70, 239, 0.7)',
              'rgba(236, 72, 153, 0.7)',
              'rgba(244, 63, 94, 0.7)',
              'rgba(251, 113, 133, 0.7)',
              'rgba(249, 168, 212, 0.7)',
              'rgba(232, 121, 249, 0.7)'
            ],
            borderColor: 'rgba(79, 70, 229, 1)',
            borderWidth: 1,
            borderRadius: 6,
          }
        ],
      });
    }
  }, [videos]);

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
        display: false,
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
            const idx = tooltipItems[0].dataIndex;
            return videos.sort((a, b) => b.engagement_rate - a.engagement_rate)[idx]?.title || '';
          },
          label: (context: any) => {
            const idx = context.dataIndex;
            const sortedVideos = videos.sort((a, b) => b.engagement_rate - a.engagement_rate);
            const video = sortedVideos[idx];
            
            if (!video) return '';
            
            const formatNumber = (num: number): string => {
              if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + ' mi';
              } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + ' mil';
              } else {
                return num.toString();
              }
            };
            
            return [
              `Taxa de Engajamento: ${(video.engagement_rate * 100).toFixed(2)}%`,
              `Visualizações: ${formatNumber(video.view_count)}`,
              `Curtidas: ${formatNumber(video.like_count)}`,
              `Comentários: ${formatNumber(video.comment_count)}`
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
          text: 'Taxa de Engajamento (%)',
          font: {
            family: "'Inter', sans-serif",
            size: 12
          }
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.5)'
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          }
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            family: "'Inter', sans-serif",
            size: 11
          }
        },
        grid: {
          display: false
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };
  
  const calculateAverageEngagement = () => {
    if (videos.length === 0) return 0;
    const sum = videos.reduce((acc, video) => acc + video.engagement_rate, 0);
    return (sum / videos.length * 100).toFixed(2);
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Top 10 Vídeos por Engajamento</h3>
        </div>
        <button 
          className="text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
          aria-label="Informações sobre taxa de engajamento"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
      
      {showInfo && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-800">
          <p>
            A taxa de engajamento é calculada pela soma de curtidas e comentários dividida pelo número de visualizações.
            Quanto maior a taxa, mais os espectadores interagem com o conteúdo.
          </p>
        </div>
      )}
      
      <div className="mb-4 flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
        <span className="text-sm font-medium text-gray-600">Engajamento médio do canal:</span>
        <span className="text-lg font-bold text-purple-700">{calculateAverageEngagement()}%</span>
      </div>
      
      <div className="h-80 mt-5">
        <Bar data={chartData} options={options} />
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        Baseado em interações dos espectadores com os vídeos (curtidas e comentários)
      </div>
    </div>
  );
};

export default EngagementChart;