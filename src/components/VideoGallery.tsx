import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, ThumbsUp, MessageSquare, Calendar, BarChart2, Clock, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

interface Video {
  video_id: string;
  title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  engagement_rate: number;
  published_at: string;
  thumbnail_url: string;
  duration_formatted: string;
}

interface VideoGalleryProps {
  videos: Video[];
}

const VideoGallery = ({ videos }: VideoGalleryProps) => {
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
  
  const getSortIcon = (field: keyof Video) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    }
    return null;
  };
  
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => handleSort('view_count')}
          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
            sortField === 'view_count' 
              ? 'bg-purple-100 text-purple-700 font-medium' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Eye className="w-4 h-4 mr-1.5" />
          <span>Visualizações</span>
          {getSortIcon('view_count')}
        </button>
        <button
          onClick={() => handleSort('like_count')}
          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
            sortField === 'like_count' 
              ? 'bg-purple-100 text-purple-700 font-medium' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ThumbsUp className="w-4 h-4 mr-1.5" />
          <span>Curtidas</span>
          {getSortIcon('like_count')}
        </button>
        <button
          onClick={() => handleSort('comment_count')}
          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
            sortField === 'comment_count' 
              ? 'bg-purple-100 text-purple-700 font-medium' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 mr-1.5" />
          <span>Comentários</span>
          {getSortIcon('comment_count')}
        </button>
        <button
          onClick={() => handleSort('engagement_rate')}
          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
            sortField === 'engagement_rate' 
              ? 'bg-purple-100 text-purple-700 font-medium' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <BarChart2 className="w-4 h-4 mr-1.5" />
          <span>Engajamento</span>
          {getSortIcon('engagement_rate')}
        </button>
        <button
          onClick={() => handleSort('published_at')}
          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
            sortField === 'published_at' 
              ? 'bg-purple-100 text-purple-700 font-medium' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4 mr-1.5" />
          <span>Data</span>
          {getSortIcon('published_at')}
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedVideos.map((video) => (
          <div key={video.video_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full">
            <a 
              href={`https://www.youtube.com/watch?v=${video.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative group"
            >
              <img 
                src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`}
                alt={video.title}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`;
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-25 transition-all duration-300 flex items-center justify-center">
                <ExternalLink className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {video.duration_formatted}
              </div>
              <div className="absolute top-2 left-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                {getTimeAgo(video.published_at)}
              </div>
            </a>
            
            <div className="p-4 flex-grow flex flex-col">
              <a 
                href={`https://www.youtube.com/watch?v=${video.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-900 hover:text-purple-600 line-clamp-2 h-10 mb-3 transition-colors"
              >
                {video.title}
              </a>
              
              <div className="text-xs text-gray-500 mb-3 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                Publicado em {formatDate(video.published_at)}
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs mt-auto">
                <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <Eye className="w-4 h-4 text-purple-600 mb-1" />
                  <span className="font-medium">{formatNumber(video.view_count)}</span>
                  <span className="text-gray-500">Views</span>
                </div>
                
                <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <ThumbsUp className="w-4 h-4 text-green-600 mb-1" />
                  <span className="font-medium">{formatNumber(video.like_count)}</span>
                  <span className="text-gray-500">Curtidas</span>
                </div>
                
                <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <MessageSquare className="w-4 h-4 text-purple-600 mb-1" />
                  <span className="font-medium">{formatNumber(video.comment_count)}</span>
                  <span className="text-gray-500">Comentários</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Taxa de Engajamento:</span>
                  <div className="flex items-center">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full mr-2">
                      <div 
                        className="h-1.5 bg-purple-600 rounded-full" 
                        style={{ width: `${Math.min(100, video.engagement_rate * 100 * 5)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                      {(video.engagement_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {sortedVideos.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500">Nenhum vídeo encontrado com os critérios atuais.</p>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;