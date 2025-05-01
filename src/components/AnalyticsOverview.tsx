import { useState, useEffect } from 'react';
import { useChannelStore } from '../stores/channelStore';
import { BarChart, CheckCircle, Calendar, TrendingUp, Users, Video, Eye, Activity } from 'lucide-react';

const AnalyticsOverview = () => {
  const { channels } = useChannelStore();
  const [stats, setStats] = useState({
    totalChannels: 0,
    totalVideos: 0,
    totalViews: 0,
    averageEngagement: 0,
    recentlyAnalyzed: '',
  });
  
  useEffect(() => {
    if (channels.length > 0) {
      // Calcula total de canais, vídeos e visualizações
      const totalChannels = channels.length;
      const totalVideos = channels.reduce((sum, channel) => sum + channel.video_count, 0);
      const totalViews = channels.reduce((sum, channel) => sum + channel.view_count, 0);
      
      // Encontra o canal analisado mais recentemente
      const mostRecent = [...channels].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      
      setStats({
        totalChannels,
        totalVideos,
        totalViews,
        averageEngagement: 2.1, // Valor placeholder, seria calculado com dados reais
        recentlyAnalyzed: mostRecent?.title || '',
      });
    }
  }, [channels]);
  
  // Formata números grandes com vírgulas e abrevia se necessário
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-600 mr-4 shadow-sm">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total de Canais</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalChannels}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="flex items-center bg-green-50 text-green-600 rounded-full px-3 py-1 text-xs font-medium">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
            +{Math.min(stats.totalChannels, 3)} recentes
          </div>
          <span className="ml-2 text-gray-500 text-xs">analisados</span>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center">
          <div className="p-3 rounded-xl bg-purple-100 text-purple-600 mr-4 shadow-sm">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total de Vídeos</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalVideos)}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className="bg-purple-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, (stats.totalVideos / (stats.totalChannels * 100)) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-500 text-xs">Média</span>
            <span className="text-gray-700 text-xs font-medium">
              {(stats.totalVideos / Math.max(1, stats.totalChannels)).toFixed(0)} vídeos por canal
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center">
          <div className="p-3 rounded-xl bg-green-100 text-green-600 mr-4 shadow-sm">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total de Visualizações</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalViews)}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Por vídeo</span>
            <span className="text-xs text-gray-700 font-medium">
              {formatNumber(stats.totalViews / Math.max(1, stats.totalVideos))}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">Por canal</span>
            <span className="text-xs text-gray-700 font-medium">
              {formatNumber(stats.totalViews / Math.max(1, stats.totalChannels))}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-600 mr-4 shadow-sm">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Análise Recente</p>
            <p className="text-lg font-bold text-gray-900 truncate max-w-[180px]">
              {stats.recentlyAnalyzed || 'Nenhum'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Engajamento médio</span>
              <span className="text-xs font-medium text-gray-700">{stats.averageEngagement}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className="bg-amber-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, stats.averageEngagement * 10)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;