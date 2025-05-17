import React, { useState } from 'react';
import { Heart, MessageCircle, Eye, Video, Calendar, ExternalLink, Image, TrendingUp, BarChart2, X, Grid, List } from 'lucide-react';
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

    if (posts.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <Image className="h-10 w-10 text-[#9e46d3]/60" />
                </div>
                <h3 className="mt-4 text-base font-medium text-gray-900">Nenhuma publicação encontrada</h3>
                <p className="mt-2 text-sm text-gray-500">Nenhuma publicação foi recuperada para este perfil.</p>
            </div>
        );
    }

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

    // Função para obter a URL proxificada de uma imagem de post
    const getPostImage = (url: string) => {
        return getProxiedImageUrl(url);
    };

    // Calculate engagement rate for a post
    const calculatePostEngagement = (post: Post) => {
        // For video posts, include views in the calculation
        if (post.is_video && post.video_view_count) {
            // (likes + comments) / views * 100
            return ((post.likes_count + post.comments_count) / post.video_view_count) * 100;
        }
        // For regular posts, just return a simple engagement number (likes + comments)
        return post.likes_count + post.comments_count;
    };

    // Determine performance rating based on engagement
    const getPerformanceRating = (post: Post) => {
        const engagement = calculatePostEngagement(post);

        if (post.is_video && post.video_view_count) {
            // For videos
            if (engagement > 15) return { label: 'Excelente', color: 'bg-[#9e46d3]' };
            if (engagement > 10) return { label: 'Bom', color: 'bg-blue-500' };
            if (engagement > 5) return { label: 'Médio', color: 'bg-yellow-500' };
            return { label: 'Baixo', color: 'bg-gray-400' };
        } else {
            // For photos, use absolute numbers since we don't have a denominator
            if (engagement > 1000) return { label: 'Viral', color: 'bg-[#9e46d3]' };
            if (engagement > 500) return { label: 'Excelente', color: 'bg-green-500' };
            if (engagement > 200) return { label: 'Bom', color: 'bg-blue-500' };
            if (engagement > 100) return { label: 'Médio', color: 'bg-yellow-500' };
            return { label: 'Baixo', color: 'bg-gray-400' };
        }
    };

    // Format date to PT-BR
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <span className="bg-[#9e46d3]/10 text-[#9e46d3] w-8 h-8 rounded-full flex items-center justify-center mr-2">
                        <Image className="h-4 w-4" />
                    </span>
                    {posts.length} Publicações
                </h2>
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

            {activeTab === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {posts.map((post) => {
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
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] flex flex-col justify-between p-3">
                                    <div className="flex justify-end">
                                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${performanceRating.color} backdrop-blur-sm shadow-sm`}>
                                            {performanceRating.label}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex space-x-3">
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
                                            <div className="flex items-center justify-center bg-[#9e46d3] text-white h-6 w-6 rounded-full">
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
                    {posts.map((post) => {
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

            {/* Modal detalhado com efeito de vidro */}
            {selectedPost && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={closeModal}>
                    <div 
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col md:flex-row h-full">
                            <div className="md:w-1/2 bg-black flex items-center justify-center">
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
                            </div>
                            <div className="md:w-1/2 p-6 flex flex-col relative overflow-y-auto max-h-[500px]">
                                <button 
                                    onClick={closeModal} 
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors duration-200"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <div className="mb-5 flex items-center">
                                    <div className={`px-2.5 py-1 mr-3 rounded-full text-xs font-medium text-white ${getPerformanceRating(selectedPost).color} shadow-sm`}>
                                        {getPerformanceRating(selectedPost).label}
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedPost.is_video ? 'Vídeo' : 'Foto'}
                                    </h3>
                                </div>

                                <div className="mb-5 bg-[#9e46d3]/5 p-4 rounded-xl backdrop-blur-sm border border-[#9e46d3]/10">
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
                                        <div className={`bg-[#9e46d3] h-2 rounded-full transition-all duration-1000 ease-in-out`}
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
                                        <div className="mb-5">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Legenda</h4>
                                            <p className="text-gray-800 whitespace-pre-line text-sm bg-gray-50 p-4 rounded-xl">{selectedPost.caption}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mb-5">
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Curtidas</div>
                                            <div className="text-lg font-bold text-[#9e46d3]">{selectedPost.likes_count.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Comentários</div>
                                            <div className="text-lg font-bold text-[#9e46d3]">{selectedPost.comments_count.toLocaleString()}</div>
                                        </div>
                                        {selectedPost.video_view_count && (
                                            <div className="bg-gray-50 p-3 rounded-xl">
                                                <div className="text-xs font-medium text-gray-500 mb-1">Visualizações</div>
                                                <div className="text-lg font-bold text-[#9e46d3]">{selectedPost.video_view_count.toLocaleString()}</div>
                                            </div>
                                        )}
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Data</div>
                                            <div className="text-gray-800">{formatDate(selectedPost.timestamp)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <a
                                        href={selectedPost.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-[#9e46d3] hover:bg-[#8a3eba] transition-colors duration-200"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Ver no Instagram
                                    </a>
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