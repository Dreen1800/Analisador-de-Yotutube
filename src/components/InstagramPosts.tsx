import React, { useState, useEffect, useMemo } from 'react';
import { Heart, MessageCircle, Eye, Video, Calendar, ExternalLink, Image, TrendingUp, BarChart2, X, Grid, List, Clock, Share2, Filter, ChevronDown, CheckCircle2, SlidersHorizontal, Image as ImageIcon, BarChart, SortAsc } from 'lucide-react';
import { getProxiedImageUrl } from '../services/instagramService';

interface Post {
    id: string;
    instagram_id: string;
    short_code: string;
    type: string;
    url: string;
    caption: string;
    timestamp: string;
    likes_count: number;
    comments_count: number;
    video_view_count?: number;
    display_url: string;
    is_video: boolean;
}

interface InstagramPostsProps {
    posts: Post[];
}

const InstagramPosts: React.FC<InstagramPostsProps> = ({ posts }) => {
    const [activeTab, setActiveTab] = useState<'grid' | 'list'>('grid');
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
    const [isVisible, setIsVisible] = useState(false);
    const [filters, setFilters] = useState({
        type: 'all', // 'all', 'photo', 'video'
        performance: 'all', // 'all', 'viral', 'excellent', 'good', 'medium', 'low'
        timeFrame: 'all', // 'all', 'week', 'month', 'year'
        sortBy: 'date' // 'date', 'likes', 'comments', 'engagement'
    });
    const [showFilters, setShowFilters] = useState(false);

    // Animation effect on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    // Helper Functions
    const getPostImage = (url: string) => {
        return getProxiedImageUrl(url);
    };

    const calculatePostEngagement = (post: Post) => {
        if (post.is_video && post.video_view_count) {
            return ((post.likes_count + post.comments_count) / post.video_view_count) * 100;
        }
        return post.likes_count + post.comments_count;
    };

    const getPerformanceRating = (post: Post) => {
        const engagement = calculatePostEngagement(post);

        if (post.is_video && post.video_view_count) {
            if (engagement > 15) return { label: 'Excelente', color: 'bg-[#9e46d3]' };
            if (engagement > 10) return { label: 'Bom', color: 'bg-blue-500' };
            if (engagement > 5) return { label: 'Médio', color: 'bg-yellow-500' };
            return { label: 'Baixo', color: 'bg-gray-400' };
        } else {
            if (engagement > 1000) return { label: 'Viral', color: 'bg-[#9e46d3]' };
            if (engagement > 500) return { label: 'Excelente', color: 'bg-green-500' };
            if (engagement > 200) return { label: 'Bom', color: 'bg-blue-500' };
            if (engagement > 100) return { label: 'Médio', color: 'bg-yellow-500' };
            return { label: 'Baixo', color: 'bg-gray-400' };
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Hoje';
        } else if (diffDays === 1) {
            return 'Ontem';
        } else if (diffDays < 7) {
            return `${diffDays} dias atrás`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years} ${years === 1 ? 'ano' : 'anos'} atrás`;
        }
    };

    const resetFilters = () => {
        setFilters({
            type: 'all',
            performance: 'all',
            timeFrame: 'all',
            sortBy: 'date'
        });
        setShowFilters(false);
    };

    const handleFilterChange = (filterType: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    // Filter and sort posts
    const filteredPosts = useMemo(() => {
        let result = [...posts];

        // Filter by type
        if (filters.type === 'photo') {
            result = result.filter(post => !post.is_video);
        } else if (filters.type === 'video') {
            result = result.filter(post => post.is_video);
        }

        // Filter by performance
        if (filters.performance !== 'all') {
            result = result.filter(post => {
                const rating = getPerformanceRating(post);
                return rating.label.toLowerCase() === filters.performance;
            });
        }

        // Filter by time frame
        if (filters.timeFrame !== 'all') {
            const now = new Date();
            let cutoffDate = new Date();

            if (filters.timeFrame === 'week') {
                cutoffDate.setDate(now.getDate() - 7);
            } else if (filters.timeFrame === 'month') {
                cutoffDate.setMonth(now.getMonth() - 1);
            } else if (filters.timeFrame === 'year') {
                cutoffDate.setFullYear(now.getFullYear() - 1);
            }

            result = result.filter(post => new Date(post.timestamp) >= cutoffDate);
        }

        // Sort posts
        result.sort((a, b) => {
            if (filters.sortBy === 'date') {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            } else if (filters.sortBy === 'likes') {
                return b.likes_count - a.likes_count;
            } else if (filters.sortBy === 'comments') {
                return b.comments_count - a.comments_count;
            } else if (filters.sortBy === 'engagement') {
                return calculatePostEngagement(b) - calculatePostEngagement(a);
            }
            return 0;
        });

        return result;
    }, [posts, filters]);

    const handlePostClick = (post: Post) => {
        setSelectedPost(post);
    };

    const closeModal = () => {
        setSelectedPost(null);
    };

    const handleImgError = (id: string) => {
        console.error(`Failed to load post image for ${id}`);
        setImgErrors(prev => ({
            ...prev,
            [id]: true
        }));
    };

    if (posts.length === 0) {
        return (
            <div className={`text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-500 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <Image className="h-10 w-10 text-[#9e46d3]/60" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma publicação encontrada</h3>
                <p className="mt-2 text-sm text-gray-500">Nenhuma publicação foi recuperada para este perfil.</p>
            </div>
        );
    }

    return (
        <div className={`mt-8 transition-all duration-500 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="flex items-center text-xl font-bold text-gray-900">
                    <div className="bg-[#9e46d3]/10 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                        <Image className="h-4 w-4 text-[#9e46d3]" />
                    </div>
                    {filteredPosts.length} Publicações
                    {filteredPosts.length !== posts.length && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            (de {posts.length} total)
                        </span>
                    )}
                </h2>

                {/* Controles */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-[#9e46d3]/10 text-[#9e46d3] hover:bg-[#9e46d3]/20 transition-colors duration-200"
                    >
                        <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                        Filtros
                        <ChevronDown className={`h-4 w-4 ml-1.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                    </button>

                    <div className="flex p-1 bg-gray-50 rounded-lg shadow-sm">
                        <button
                            onClick={() => setActiveTab('grid')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center transition-all duration-200 ${activeTab === 'grid'
                                ? 'bg-white shadow-sm text-[#9e46d3]'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Grid className="h-4 w-4 mr-1.5" />
                            Grade
                        </button>
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center transition-all duration-200 ${activeTab === 'list'
                                ? 'bg-white shadow-sm text-[#9e46d3]'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <List className="h-4 w-4 mr-1.5" />
                            Lista
                        </button>
                    </div>
                </div>
            </div>

            {/* Painel de filtros */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6 transition-all duration-300 animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-medium text-gray-900">Filtrar publicações</h3>
                        <div className="flex space-x-2">
                            <button
                                onClick={resetFilters}
                                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                            >
                                Limpar
                            </button>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-500 hover:text-gray-700 bg-gray-100 p-1.5 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Tipo de post */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Tipo de publicação</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleFilterChange('type', 'all')}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-sm ${filters.type === 'all'
                                        ? 'bg-[#9e46d3] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        } transition-colors duration-200`}
                                >
                                    {filters.type === 'all' && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                                    Todos
                                </button>
                                <button
                                    onClick={() => handleFilterChange('type', 'photo')}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-sm ${filters.type === 'photo'
                                        ? 'bg-[#9e46d3] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        } transition-colors duration-200`}
                                >
                                    {filters.type === 'photo' && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                                    <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                                    Fotos
                                </button>
                                <button
                                    onClick={() => handleFilterChange('type', 'video')}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-sm ${filters.type === 'video'
                                        ? 'bg-[#9e46d3] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        } transition-colors duration-200`}
                                >
                                    {filters.type === 'video' && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                                    <Video className="h-3.5 w-3.5 mr-1.5" />
                                    Vídeos
                                </button>
                            </div>
                        </div>

                        {/* Desempenho */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Desempenho</label>
                            <select
                                value={filters.performance}
                                onChange={(e) => handleFilterChange('performance', e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9e46d3] focus:border-[#9e46d3]"
                            >
                                <option value="all">Todos os desempenhos</option>
                                <option value="viral">Viral</option>
                                <option value="excelente">Excelente</option>
                                <option value="bom">Bom</option>
                                <option value="médio">Médio</option>
                                <option value="baixo">Baixo</option>
                            </select>
                        </div>

                        {/* Período */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Período</label>
                            <select
                                value={filters.timeFrame}
                                onChange={(e) => handleFilterChange('timeFrame', e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9e46d3] focus:border-[#9e46d3]"
                            >
                                <option value="all">Todo período</option>
                                <option value="week">Última semana</option>
                                <option value="month">Último mês</option>
                                <option value="year">Último ano</option>
                            </select>
                        </div>

                        {/* Ordenação */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Ordenar por</label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9e46d3] focus:border-[#9e46d3]"
                            >
                                <option value="date">Data (mais recentes)</option>
                                <option value="likes">Mais curtidas</option>
                                <option value="comments">Mais comentários</option>
                                <option value="engagement">Maior engajamento</option>
                            </select>
                        </div>
                    </div>

                    {/* Contador de resultados */}
                    <div className="mt-4 text-sm text-gray-500 flex items-center">
                        <Filter className="h-4 w-4 mr-1.5 text-[#9e46d3]" />
                        {filteredPosts.length} {filteredPosts.length === 1 ? 'publicação encontrada' : 'publicações encontradas'}
                        {filteredPosts.length !== posts.length && (
                            <> de {posts.length} no total</>
                        )}
                    </div>
                </div>
            )}

            {/* Conditional rendering for no filtered posts */}
            {posts.length > 0 && filteredPosts.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <Filter className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma publicação corresponde aos filtros</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                        Tente ajustar os critérios de filtro ou
                        <button
                            onClick={resetFilters}
                            className="text-[#9e46d3] hover:text-[#8a3dbd] ml-1 font-medium"
                        >
                            limpar todos os filtros
                        </button>.
                    </p>
                </div>
            )}

            {/* Grid/List View (only if there are filtered posts) */}
            {filteredPosts.length > 0 && (
                <>
                    {activeTab === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredPosts.map((post) => {
                                const performanceRating = getPerformanceRating(post);
                                return (
                                    <div
                                        key={post.id}
                                        className="relative aspect-square overflow-hidden rounded-xl cursor-pointer bg-gray-50 shadow-sm group hover:shadow-md transition-all duration-300"
                                        onClick={() => handlePostClick(post)}
                                    >
                                        {!imgErrors[post.id] ? (
                                            <img
                                                src={getPostImage(post.display_url)}
                                                alt={post.caption?.substring(0, 20) || 'Publicação do Instagram'}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                onError={() => handleImgError(post.id)}
                                                referrerPolicy="no-referrer"
                                                crossOrigin="anonymous"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                <Image className="h-10 w-10 text-gray-300" />
                                            </div>
                                        )}

                                        {/* Overlay com efeito de vidro */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px] flex flex-col justify-between p-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center text-white text-xs bg-black/20 backdrop-blur-sm px-2 py-1 rounded-full">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {formatTimeAgo(post.timestamp)}
                                                </div>
                                                <div className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${performanceRating.color} backdrop-blur-sm shadow-sm`}>
                                                    {performanceRating.label}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="flex space-x-2">
                                                    <div className="flex items-center text-white backdrop-blur-sm bg-black/20 px-2 py-1 rounded-full">
                                                        <Heart className="h-3.5 w-3.5 mr-1 fill-current text-pink-300" />
                                                        <span className="text-xs font-medium">{post.likes_count >= 1000 ? `${(post.likes_count / 1000).toFixed(1)}K` : post.likes_count}</span>
                                                    </div>
                                                    <div className="flex items-center text-white backdrop-blur-sm bg-black/20 px-2 py-1 rounded-full">
                                                        <MessageCircle className="h-3.5 w-3.5 mr-1 text-blue-300" />
                                                        <span className="text-xs font-medium">{post.comments_count >= 1000 ? `${(post.comments_count / 1000).toFixed(1)}K` : post.comments_count}</span>
                                                    </div>
                                                </div>
                                                {post.is_video && (
                                                    <div className="flex items-center justify-center bg-[#9e46d3] text-white h-6 w-6 rounded-full shadow-lg">
                                                        <Video className="h-3.5 w-3.5" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filteredPosts.map((post) => {
                                const performanceRating = getPerformanceRating(post);
                                const engagementValue = post.is_video && post.video_view_count
                                    ? calculatePostEngagement(post).toFixed(2) + '%'
                                    : calculatePostEngagement(post).toLocaleString();

                                return (
                                    <div
                                        key={post.id}
                                        className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col sm:flex-row cursor-pointer hover:shadow-md transition-all duration-300 group"
                                        onClick={() => handlePostClick(post)}
                                    >
                                        <div className="sm:w-56 h-56 sm:h-auto flex-shrink-0 relative overflow-hidden">
                                            {!imgErrors[post.id] ? (
                                                <img
                                                    src={getPostImage(post.display_url)}
                                                    alt={post.caption?.substring(0, 20) || 'Publicação do Instagram'}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    onError={() => handleImgError(post.id)}
                                                    referrerPolicy="no-referrer"
                                                    crossOrigin="anonymous"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                    <Image className="h-12 w-12 text-gray-300" />
                                                </div>
                                            )}
                                            {post.is_video && (
                                                <div className="absolute top-3 right-3 bg-[#9e46d3] text-white h-8 w-8 rounded-full flex items-center justify-center shadow-lg">
                                                    <Video className="h-4 w-4" />
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3">
                                                <div className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${performanceRating.color} backdrop-blur-sm shadow-sm`}>
                                                    {performanceRating.label}
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-3 px-3">
                                                <div className="flex items-center text-white text-xs">
                                                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                                                    {formatTimeAgo(post.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-5 flex flex-col">
                                            <div className="mb-4 line-clamp-2 text-gray-800 text-sm">
                                                {post.caption || 'Sem legenda'}
                                            </div>

                                            <div className="mt-1 bg-[#9e46d3]/5 p-4 rounded-xl mb-auto backdrop-blur-sm border border-[#9e46d3]/10">
                                                <div className="flex items-center mb-2">
                                                    <div className="p-1.5 rounded-full bg-[#9e46d3]/10 mr-2">
                                                        <TrendingUp className="h-4 w-4 text-[#9e46d3]" />
                                                    </div>
                                                    <h3 className="text-xs font-medium text-[#9e46d3]">
                                                        Engajamento {post.is_video ? '(curtidas+comentários)/visualizações' : '(curtidas+comentários)'}
                                                    </h3>
                                                </div>
                                                <div className="flex items-end">
                                                    <span className="text-xl font-bold text-gray-900">{engagementValue}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                                                    <div className={`bg-[#9e46d3] h-2 rounded-full transition-all duration-1000 ease-in-out`}
                                                        style={{
                                                            width: `${Math.min(100, post.is_video && post.video_view_count
                                                                ? calculatePostEngagement(post) * 3
                                                                : Math.min(100, (calculatePostEngagement(post) / 1000) * 100))}%`
                                                        }}>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-4">
                                                <div className="flex items-center text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full">
                                                    <Heart className="h-4 w-4 mr-1.5 text-[#9e46d3]" />
                                                    <span>{post.likes_count.toLocaleString()} curtidas</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full">
                                                    <MessageCircle className="h-4 w-4 mr-1.5 text-[#9e46d3]" />
                                                    <span>{post.comments_count.toLocaleString()} comentários</span>
                                                </div>
                                                {post.video_view_count && (
                                                    <div className="flex items-center text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full">
                                                        <Eye className="h-4 w-4 mr-1.5 text-[#9e46d3]" />
                                                        <span>{post.video_view_count.toLocaleString()} visualizações</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full">
                                                    <Calendar className="h-4 w-4 mr-1.5 text-[#9e46d3]" />
                                                    <span>{formatDate(post.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Modal detalhado com efeito de vidro */}
            {selectedPost && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300"
                    onClick={closeModal}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl transform transition-all duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col md:flex-row h-full">
                            <div className="md:w-1/2 bg-black relative flex items-center justify-center">
                                {!imgErrors[`modal-${selectedPost.id}`] ? (
                                    <img
                                        src={getPostImage(selectedPost.display_url)}
                                        alt={selectedPost.caption?.substring(0, 20) || 'Publicação do Instagram'}
                                        className="max-w-full max-h-[500px] object-contain"
                                        onError={() => handleImgError(`modal-${selectedPost.id}`)}
                                        referrerPolicy="no-referrer"
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <div className="w-full h-[300px] flex items-center justify-center bg-gray-800">
                                        <Image className="h-16 w-16 text-gray-500" />
                                    </div>
                                )}

                                {/* Tempo atrás (no modo mobile aparece aqui) */}
                                <div className="absolute top-4 left-4 md:hidden">
                                    <div className="flex items-center bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-xs">
                                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                                        {formatTimeAgo(selectedPost.timestamp)}
                                    </div>
                                </div>

                                {/* Ícone de vídeo (se for vídeo) */}
                                {selectedPost.is_video && (
                                    <div className="absolute top-4 right-4">
                                        <div className="bg-[#9e46d3] text-white h-8 w-8 rounded-full flex items-center justify-center shadow-lg">
                                            <Video className="h-4 w-4" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="md:w-1/2 p-6 flex flex-col relative overflow-y-auto max-h-[500px]">
                                <button
                                    onClick={closeModal}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors duration-200"
                                    aria-label="Fechar"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <div className="mb-6 flex flex-wrap items-center justify-between">
                                    <div className="flex items-center mb-2 md:mb-0">
                                        <div className={`px-2.5 py-1 mr-3 rounded-full text-xs font-medium text-white ${getPerformanceRating(selectedPost).color} shadow-sm`}>
                                            {getPerformanceRating(selectedPost).label}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {selectedPost.is_video ? 'Vídeo' : 'Foto'}
                                        </h3>
                                    </div>

                                    {/* Tempo atrás (visível apenas em desktop) */}
                                    <div className="hidden md:flex items-center text-gray-500 text-sm">
                                        <Clock className="h-4 w-4 mr-1.5" />
                                        {formatTimeAgo(selectedPost.timestamp)}
                                    </div>
                                </div>

                                <div className="mb-6 bg-[#9e46d3]/5 p-4 rounded-xl backdrop-blur-sm border border-[#9e46d3]/10">
                                    <div className="flex items-center mb-2">
                                        <div className="p-1.5 rounded-full bg-[#9e46d3]/10 mr-2">
                                            <TrendingUp className="h-4 w-4 text-[#9e46d3]" />
                                        </div>
                                        <h3 className="text-xs font-medium text-[#9e46d3]">Métricas de Engajamento</h3>
                                    </div>
                                    <div className="flex items-end">
                                        <span className="text-xl font-bold text-gray-900">
                                            {selectedPost.is_video && selectedPost.video_view_count
                                                ? `${calculatePostEngagement(selectedPost).toFixed(2)}%`
                                                : calculatePostEngagement(selectedPost).toLocaleString()}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-2 mb-1">
                                            {selectedPost.is_video && selectedPost.video_view_count
                                                ? 'taxa de engajamento'
                                                : 'interações totais'}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
                                        <div className={`bg-gradient-to-r from-[#9e46d3] to-[#b464e0] h-2 rounded-full transition-all duration-1000 ease-in-out`}
                                            style={{
                                                width: `${Math.min(100, selectedPost.is_video && selectedPost.video_view_count
                                                    ? calculatePostEngagement(selectedPost) * 3
                                                    : Math.min(100, (calculatePostEngagement(selectedPost) / 1000) * 100))}%`
                                            }}>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-grow">
                                    {selectedPost.caption && (
                                        <div className="mb-6">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Legenda</h4>
                                            <p className="text-gray-800 whitespace-pre-line text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">{selectedPost.caption}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 transition-all duration-300 hover:border-[#9e46d3]/20 hover:shadow-sm">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Curtidas</div>
                                            <div className="text-lg font-bold text-[#9e46d3]">{selectedPost.likes_count.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 transition-all duration-300 hover:border-[#9e46d3]/20 hover:shadow-sm">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Comentários</div>
                                            <div className="text-lg font-bold text-[#9e46d3]">{selectedPost.comments_count.toLocaleString()}</div>
                                        </div>
                                        {selectedPost.video_view_count && (
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 transition-all duration-300 hover:border-[#9e46d3]/20 hover:shadow-sm">
                                                <div className="text-xs font-medium text-gray-500 mb-1">Visualizações</div>
                                                <div className="text-lg font-bold text-[#9e46d3]">{selectedPost.video_view_count.toLocaleString()}</div>
                                            </div>
                                        )}
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 transition-all duration-300 hover:border-[#9e46d3]/20 hover:shadow-sm">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Data da publicação</div>
                                            <div className="text-gray-800">{formatDate(selectedPost.timestamp)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200 flex justify-between">
                                    <a
                                        href={selectedPost.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-[#9e46d3] hover:bg-[#8a3dbd] transition-colors duration-200"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Ver no Instagram
                                    </a>

                                    <button
                                        className="ml-2 p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors duration-200"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(selectedPost.url);
                                            alert('Link copiado para área de transferência!');
                                        }}
                                        aria-label="Copiar link"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstagramPosts;