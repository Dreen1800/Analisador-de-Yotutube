import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, ThumbsUp, MessageSquare, TrendingUp, Clock, Calendar, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

interface Video {
  video_id: string;
  title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  engagement_rate: number;
  views_per_day: number;
  duration_seconds: number;
  duration_formatted: string;
  published_at: string;
  thumbnail_url: string;
}

interface VideoListProps {
  videos: Video[];
}

const VideoList = ({ videos }: VideoListProps) => {
  const [sortField, setSortField] = useState<keyof Video>('view_count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Formata números grandes com abreviações
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + ' mi';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + ' mil';
    } else {
      return num.toString();
    }
  };
  
  // Formata data
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), "d 'de' MMM 'de' yyyy", { locale: ptBR });
  };
  
  // Calcula há quanto tempo o vídeo foi publicado
  const getTimeAgo = (dateString: string): string => {
    const publishDate = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Hoje';
    } else if (diffInDays === 1) {
      return 'Ontem';
    } else if (diffInDays < 30) {
      return `${diffInDays} dias atrás`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} ${years === 1 ? 'ano' : 'anos'} atrás`;
    }
  };
  
  // Trata a mudança de ordenação
  const handleSort = (field: keyof Video) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Ordena vídeos
  const sortedVideos = [...videos].sort((a, b) => {
    if (sortDirection === 'asc') {
      return a[sortField] > b[sortField] ? 1 : -1;
    } else {
      return a[sortField] < b[sortField] ? 1 : -1;
    }
  });
  
  // Renderiza cabeçalho de ordenação
  const renderSortHeader = (field: keyof Video, label: string, icon: React.ReactNode) => {
    const isActive = sortField === field;
    
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-6 py-3.5 cursor-pointer transition-colors text-left text-xs font-medium uppercase tracking-wider ${
          isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center">
          <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
            {icon}
          </div>
          <span className={`ml-1.5 ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>{label}</span>
          {isActive && (
            <span className="ml-1.5 text-blue-600">
              {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            </span>
          )}
        </div>
      </th>
    );
  };
  
  if (videos.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-500">Nenhum vídeo encontrado com os critérios atuais.</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vídeo
            </th>
            {renderSortHeader('view_count', 'Visualizações', <Eye className="w-4 h-4" />)}
            {renderSortHeader('like_count', 'Curtidas', <ThumbsUp className="w-4 h-4" />)}
            {renderSortHeader('comment_count', 'Comentários', <MessageSquare className="w-4 h-4" />)}
            {renderSortHeader('engagement_rate', 'Engajamento', <TrendingUp className="w-4 h-4" />)}
            {renderSortHeader('duration_seconds', 'Duração', <Clock className="w-4 h-4" />)}
            {renderSortHeader('published_at', 'Publicação', <Calendar className="w-4 h-4" />)}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedVideos.map((video) => (
            <tr key={video.video_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <a 
                    href={`https://www.youtube.com/watch?v=${video.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-24 h-14 relative rounded-md overflow-hidden group"
                  >
                    <img 
                      src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`;
                      }}
                    />
                    <div className="absolute bottom-0 right-0 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 m-1 rounded">
                      {video.duration_formatted}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300">
                      <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </a>
                  <div className="flex-1 min-w-0">
                    <a 
                      href={`https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 transition-colors"
                    >
                      {video.title}
                    </a>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      <span className="mr-2">{formatDate(video.published_at)}</span>
                      <span className="text-gray-400">•</span>
                      <span className="ml-2 text-xs text-gray-500">{getTimeAgo(video.published_at)}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-700">{formatNumber(video.view_count)}</div>
                <div className="text-xs text-gray-500">visualizações</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-700">{formatNumber(video.like_count)}</div>
                <div className="text-xs text-gray-500">curtidas</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-700">{formatNumber(video.comment_count)}</div>
                <div className="text-xs text-gray-500">comentários</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="mr-2">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                      <div 
                        className="h-1.5 bg-blue-600 rounded-full" 
                        style={{ width: `${Math.min(100, video.engagement_rate * 100 * 5)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{(video.engagement_rate * 100).toFixed(1)}%</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {video.duration_formatted}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {formatDate(video.published_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VideoList;