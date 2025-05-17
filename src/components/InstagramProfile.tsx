import React, { useState, useEffect } from 'react';
import { Instagram, Users, Award, Image, Calendar, TrendingUp, BarChart, Heart, MessageCircle, Share2 } from 'lucide-react';
import { getProxiedImageUrl } from '../services/instagramService';

interface InstagramProfileProps {
    profile: {
        id: string;
        instagram_id: string;
        username: string;
        full_name: string;
        biography: string;
        followers_count: number;
        follows_count: number;
        posts_count: number;
        profile_pic_url: string;
        is_business_account: boolean;
        business_category_name?: string;
        created_at: string;
    };
}

const InstagramProfile: React.FC<InstagramProfileProps> = ({ profile }) => {
    const [imgError, setImgError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Animation effect on mount
    useEffect(() => {
        setIsVisible(true);
    }, []);

    // Function to handle image loading errors
    const handleImageError = () => {
        console.error(`Failed to load profile image from URL: ${profile.profile_pic_url}`);
        setImgError(true);
    };

    // Get proxied image URL
    const proxiedProfileImageUrl = getProxiedImageUrl(profile.profile_pic_url);

    // Calculate engagement rate based on followers
    const estimatedAvgLikes = profile.followers_count * 0.03;
    const engagementRate = (estimatedAvgLikes / profile.followers_count) * 100;

    // Profile health score calculation
    const followRatio = profile.followers_count / (profile.follows_count || 1);
    const profileHealth = Math.min(100, Math.round((followRatio * 20) + (profile.posts_count / 10)));

    // Format large numbers with k/m suffix
    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    return (
        <div className={`overflow-visible transition-all duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Estrutura simplificada para impedir sobreposição */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                {/* Cabeçalho com efeito de blur */}
                <div className="h-32 w-full bg-[#9e46d3] rounded-t-xl relative overflow-hidden">
                    {/* Textura e efeitos do background */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute inset-0 backdrop-blur-sm bg-white/10"></div>
                    
                    {/* Elementos decorativos */}
                    <div className="absolute top-6 right-6 w-16 h-16 rounded-full bg-white/20 backdrop-blur-md"></div>
                    <div className="absolute top-12 right-20 w-8 h-8 rounded-full bg-white/30 backdrop-blur-md"></div>
                </div>
                
                {/* Container para foto + informações */}
                <div className="flex flex-col px-6">
                    {/* Foto de perfil em container separado */}
                    <div className="flex justify-start -mt-14 mb-4 relative z-10">
                        <div className="p-1 rounded-full bg-[#9e46d3] shadow-xl">
                            {!imgError && profile.profile_pic_url ? (
                                <img
                                    src={proxiedProfileImageUrl}
                                    alt={profile.username}
                                    className="w-28 h-28 rounded-full border-2 border-white object-cover"
                                    onError={handleImageError}
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    loading="eager"
                                    fetchPriority="high"
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                                    <Instagram className="h-14 w-14 text-[#9e46d3]/60" />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Informação do perfil */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between mb-6">
                        <div className="transition-all duration-300 hover:translate-x-1">
                            <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
                            <div className="flex items-center text-gray-600 mt-1">
                                <Instagram className="h-4 w-4 mr-1" />
                                <span className="text-[#9e46d3] font-medium">@{profile.username}</span>
                            </div>

                            {profile.is_business_account && profile.business_category_name && (
                                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#9e46d3]/10 text-[#9e46d3] backdrop-blur-sm shadow-sm">
                                    <Award className="mr-1.5 h-3.5 w-3.5" />
                                    {profile.business_category_name}
                                </div>
                            )}
                        </div>

                        {/* Estatísticas com animações hover */}
                        <div className="flex mt-6 md:mt-0 space-x-8 text-center">
                            <div className="flex flex-col items-center group transition-all duration-300 hover:-translate-y-1">
                                <div className="text-2xl font-bold text-gray-900 group-hover:text-[#9e46d3] transition-colors">
                                    {formatNumber(profile.followers_count)}
                                </div>
                                <div className="text-xs font-medium text-gray-500">Seguidores</div>
                            </div>
                            <div className="flex flex-col items-center group transition-all duration-300 hover:-translate-y-1">
                                <div className="text-2xl font-bold text-gray-900 group-hover:text-[#9e46d3] transition-colors">
                                    {formatNumber(profile.follows_count)}
                                </div>
                                <div className="text-xs font-medium text-gray-500">Seguindo</div>
                            </div>
                            <div className="flex flex-col items-center group transition-all duration-300 hover:-translate-y-1">
                                <div className="text-2xl font-bold text-gray-900 group-hover:text-[#9e46d3] transition-colors">
                                    {formatNumber(profile.posts_count)}
                                </div>
                                <div className="text-xs font-medium text-gray-500">Publicações</div>
                            </div>
                        </div>
                    </div>

                    {/* Bio com animação sutil */}
                    {profile.biography && (
                        <div className="mb-6 bg-gray-50 rounded-lg p-4 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md border border-gray-100">
                            <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">{profile.biography}</p>
                        </div>
                    )}

                    {/* Cards de métricas com efeito de glassmorphism */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                        <div className="rounded-xl p-5 backdrop-blur-md bg-white border border-[#9e46d3]/20 shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] group">
                            <div className="flex items-center mb-2">
                                <div className="p-2 bg-[#9e46d3]/10 rounded-full mr-3 group-hover:bg-[#9e46d3] group-hover:text-white transition-colors">
                                    <TrendingUp className="h-4 w-4 text-[#9e46d3] group-hover:text-white" />
                                </div>
                                <h3 className="text-sm font-semibold text-[#9e46d3]">Taxa de Engajamento</h3>
                            </div>
                            <div className="flex items-end">
                                <span className="text-2xl font-bold text-gray-900">{engagementRate.toFixed(1)}%</span>
                                <span className="text-xs text-gray-500 ml-2 mb-1">dos seguidores</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
                                <div className="bg-[#9e46d3] h-2 rounded-full transition-all duration-1000 ease-in-out" 
                                    style={{ width: `${Math.min(100, engagementRate * 3)}%` }}>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center text-xs text-gray-500">
                                <Heart className="h-3 w-3 mr-1 text-[#9e46d3]" />
                                <span>~{Math.round(estimatedAvgLikes).toLocaleString()} curtidas por publicação</span>
                            </div>
                        </div>

                        <div className="rounded-xl p-5 backdrop-blur-md bg-white border border-[#9e46d3]/20 shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] group">
                            <div className="flex items-center mb-2">
                                <div className="p-2 bg-[#9e46d3]/10 rounded-full mr-3 group-hover:bg-[#9e46d3] group-hover:text-white transition-colors">
                                    <BarChart className="h-4 w-4 text-[#9e46d3] group-hover:text-white" />
                                </div>
                                <h3 className="text-sm font-semibold text-[#9e46d3]">Saúde do Perfil</h3>
                            </div>
                            <div className="flex items-end">
                                <span className="text-2xl font-bold text-gray-900">{profileHealth}</span>
                                <span className="text-xs text-gray-500 ml-2 mb-1">/ 100</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
                                <div className="bg-[#9e46d3] h-2 rounded-full transition-all duration-1000 ease-in-out" 
                                    style={{ width: `${profileHealth}%` }}>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center text-xs text-gray-500">
                                <Users className="h-3 w-3 mr-1 text-[#9e46d3]" />
                                <span>Proporção: {followRatio.toFixed(2)} seguidores por seguido</span>
                            </div>
                        </div>
                    </div>

                    {/* Rodapé com timestamp */}
                    <div className="flex items-center justify-between pb-6">
                        <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>Analisado em {new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstagramProfile;