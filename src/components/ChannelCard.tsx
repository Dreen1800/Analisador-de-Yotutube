import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Users, Play, Eye, Clock, BarChart2, Trash2, AlertCircle, Youtube } from 'lucide-react';
import { useChannelStore } from '../stores/channelStore';
import { useState } from 'react';

interface Channel {
  id: string;
  channel_id: string;
  title: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  created_at: string;
}

interface ChannelCardProps {
  channel: Channel;
}

const ChannelCard = ({ channel }: ChannelCardProps) => {
  const { deleteChannel } = useChannelStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Formata a data de criação
  const formattedDate = format(new Date(channel.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  // Formata números grandes com abreviações quando necessário
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + ' mi';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + ' mil';
    } else {
      return num.toString();
    }
  };

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      // Auto-esconde a confirmação após 3 segundos
      setTimeout(() => setShowConfirm(false), 3000);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteChannel(channel.channel_id);
    } catch (error) {
      console.error('Erro ao excluir canal:', error);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100">
      <div className="p-6">
        <div className="flex items-center mb-5">
          <div className="flex-shrink-0 mr-4">
            <img 
              src={channel.thumbnail_url || 'https://via.placeholder.com/150'} 
              alt={channel.title}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://via.placeholder.com/150?text=YouTube';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate" title={channel.title}>
              {channel.title}
            </h3>
            <div className="flex items-center mt-1">
              <Youtube className="h-3.5 w-3.5 text-red-600 mr-1" />
              <p className="text-xs text-gray-500">
                Analisado em {formattedDate}
              </p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            title={showConfirm ? "Confirmar exclusão" : "Excluir canal"}
            className={`ml-2 p-2 rounded-full transition-all duration-200 ${
              showConfirm 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
            }`}
          >
            {showConfirm ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-blue-50 rounded-lg p-3 flex items-center">
            <Users className="w-5 h-5 text-blue-500 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-800">{formatNumber(channel.subscriber_count)}</div>
              <div className="text-xs text-gray-600">Inscritos</div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3 flex items-center">
            <Play className="w-5 h-5 text-purple-500 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-800">{formatNumber(channel.video_count)}</div>
              <div className="text-xs text-gray-600">Vídeos</div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3 flex items-center">
            <Eye className="w-5 h-5 text-green-500 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-800">{formatNumber(channel.view_count)}</div>
              <div className="text-xs text-gray-600">Total de Views</div>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-3 flex items-center">
            <Clock className="w-5 h-5 text-amber-500 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-800">
                {formatNumber(Math.round(channel.view_count / Math.max(1, channel.video_count)))}
              </div>
              <div className="text-xs text-gray-600">Média de Views</div>
            </div>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Engajamento estimado</span>
            <span className="font-medium">{((channel.subscriber_count / Math.max(1, channel.view_count)) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, (channel.subscriber_count / Math.max(1, channel.view_count)) * 100 * 5)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
        <Link 
          to={`/channel-analysis/${channel.channel_id}`}
          className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
        >
          <BarChart2 className="w-4 h-4 mr-2" />
          Ver Análise Completa
        </Link>
      </div>
    </div>
  );
};

export default ChannelCard;