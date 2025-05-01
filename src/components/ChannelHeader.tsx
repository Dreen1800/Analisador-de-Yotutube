import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Play, Eye, ExternalLink, Link as LinkIcon, Youtube, Clock, Award } from 'lucide-react';

interface Channel {
  id: string;
  channel_id: string;
  title: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
}

interface ChannelHeaderProps {
  channel: Channel;
  analysisDate: string;
}

const ChannelHeader = ({ channel, analysisDate }: ChannelHeaderProps) => {
  // Formata a data de análise
  const formattedDate = format(new Date(analysisDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  // Formata números grandes com separadores
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + ' mi';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + ' mil';
    } else {
      return num.toString();
    }
  };
  
  // Calcula as views médias por vídeo
  const avgViewsPerVideo = Math.round(channel.view_count / Math.max(1, channel.video_count));
  
  // Estima uma taxa de engajamento (simplificada para demonstração)
  const engagementRate = (channel.subscriber_count / Math.max(1, channel.view_count) * 100).toFixed(1);
  
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 border border-gray-100">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-1"></div>
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center">
          <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-8">
            <div className="relative">
              <img 
                src={channel.thumbnail_url || 'https://via.placeholder.com/150'}
                alt={channel.title}
                className="w-28 h-28 rounded-xl object-cover border-2 border-gray-200 shadow-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'https://via.placeholder.com/150?text=YouTube';
                }}
              />
              <div className="absolute -bottom-3 -right-3 bg-red-600 text-white p-2 rounded-lg shadow-md">
                <Youtube className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{channel.title}</h2>
                <p className="text-sm text-gray-600 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-gray-500" />
                  Data da análise: {formattedDate}
                </p>
              </div>
              
              <a 
                href={`https://www.youtube.com/channel/${channel.channel_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 md:mt-0 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver no YouTube
              </a>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Inscritos</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(channel.subscriber_count)}</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <Play className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Vídeos</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(channel.video_count)}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Visualizações Totais</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(channel.view_count)}</p>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-2 rounded-lg mr-3">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Média por Vídeo</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(avgViewsPerVideo)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex items-center mb-3 sm:mb-0">
            <LinkIcon className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-xs text-gray-600">ID do Canal: <span className="font-mono">{channel.channel_id}</span></span>
          </div>
          
          <div className="flex items-center">
            <div className="mr-4">
              <span className="text-xs text-gray-500 block mb-1">Taxa de Engajamento</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, parseFloat(engagementRate) * 5)}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium">{engagementRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;