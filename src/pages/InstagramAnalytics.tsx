import React, { useState, useEffect } from 'react';
import { Instagram, Plus, Trash2, AlertCircle, Search, User, ArrowRight, X, Loader } from 'lucide-react';
import { useInstagramStore } from '../stores/instagramStore';
import InstagramProfile from '../components/InstagramProfile';
import InstagramPosts from '../components/InstagramPosts';
import InstagramProfileModal from '../components/InstagramProfileModal';

// Define interface for store profile to component props mapping
interface ProfileProps {
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
}

interface PostProps {
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

export default function InstagramAnalytics() {
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAppearing, setIsAppearing] = useState(false);

    const {
        profiles,
        currentProfile,
        posts,
        fetchProfiles,
        setCurrentProfile,
        fetchPosts,
        checkActiveScrapingJobs,
        deleteProfile,
        isLoading,
        error
    } = useInstagramStore();

    useEffect(() => {
        fetchProfiles();
        // Check for active jobs on load
        checkActiveScrapingJobs();
        
        // Animation effect on mount
        setTimeout(() => {
            setIsAppearing(true);
        }, 100);
    }, [fetchProfiles, checkActiveScrapingJobs]);

    const handleProfileSelect = (profile: any) => {
        setCurrentProfile(profile);
        fetchPosts(profile.id);
    };

    const handleImgError = (id: string) => {
        setImgErrors(prev => ({
            ...prev,
            [id]: true
        }));
    };

    // Add the handleOpenProfileModal function
    const handleOpenProfileModal = () => {
        setIsProfileModalOpen(true);
    };

    const handleCloseProfileModal = () => {
        setIsProfileModalOpen(false);
    };

    // Delete profile functions
    const handleDeleteClick = (e: React.MouseEvent, profileId: string) => {
        e.stopPropagation(); // Prevent profile selection when clicking delete
        setProfileToDelete(profileId);
    };

    const handleCancelDelete = () => {
        setProfileToDelete(null);
        setDeleteError(null);
    };

    const handleConfirmDelete = async () => {
        if (!profileToDelete) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            await deleteProfile(profileToDelete);
            setProfileToDelete(null);
        } catch (err: any) {
            setDeleteError(err.message || 'Erro ao excluir perfil');
        } finally {
            setIsDeleting(false);
        }
    };

    // Map store data to component props
    const mapProfileToProps = (profile: any): ProfileProps => {
        return {
            id: profile.id,
            instagram_id: profile.instagram_id,
            username: profile.username,
            full_name: profile.fullName || '',
            biography: profile.biography || '',
            followers_count: profile.followersCount || 0,
            follows_count: profile.followsCount || 0,
            posts_count: profile.postsCount || 0,
            profile_pic_url: profile.profilePicUrl || '',
            is_business_account: profile.isBusinessAccount || false,
            business_category_name: profile.businessCategoryName,
            created_at: profile.createdAt || new Date().toISOString()
        };
    };

    const mapPostsToProps = (posts: any[]): PostProps[] => {
        return posts.map(post => ({
            id: post.id,
            instagram_id: post.instagram_id,
            short_code: post.shortCode || '',
            type: post.type || 'Image',
            url: post.url || '',
            caption: post.caption || '',
            timestamp: post.timestamp || new Date().toISOString(),
            likes_count: post.likesCount || 0,
            comments_count: post.commentsCount || 0,
            video_view_count: post.videoViewCount,
            display_url: post.displayUrl || '',
            is_video: post.isVideo || false
        }));
    };

    // Filter profiles based on search term
    const filteredProfiles = profiles.filter(profile => 
        profile.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`container mx-auto p-4 md:p-6 transition-all duration-500 ease-out ${isAppearing ? 'opacity-100' : 'opacity-0'}`}>
            {profiles.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100 transform transition-all duration-500 hover:shadow-lg">
                    <div className="text-center py-10 text-gray-500">
                        <div className="bg-[#9e46d3]/10 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
                            <Instagram className="h-10 w-10 text-[#9e46d3]" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-800 mb-2">Nenhum perfil analisado</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">Clique no botão abaixo para adicionar um perfil do Instagram para análise e acompanhamento.</p>
                        <button
                            onClick={handleOpenProfileModal}
                            className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-xl shadow-sm text-white bg-[#9e46d3] hover:bg-[#8a3dbd] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9e46d3]"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Adicionar Perfil do Instagram
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-lg">
                            <div className="px-6 py-5 border-b border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center">
                                        <div className="bg-[#9e46d3]/10 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                                            <User className="h-4 w-4 text-[#9e46d3]" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800">Perfis Salvos</h2>
                                    </div>
                                    <button
                                        onClick={handleOpenProfileModal}
                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-[#9e46d3] hover:bg-[#8a3dbd] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9e46d3]"
                                        title="Adicionar novo perfil do Instagram"
                                    >
                                        <Plus className="h-4 w-4 mr-1.5" />
                                        Adicionar
                                    </button>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-[#9e46d3] focus:border-[#9e46d3] text-sm"
                                        placeholder="Buscar perfis..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="mx-6 mt-4 p-4 text-sm text-red-600 bg-red-50 rounded-lg flex items-start">
                                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-red-500" />
                                    <div>
                                        <div className="font-medium">Erro:</div>
                                        <div>{error}</div>
                                        <div className="mt-2 text-xs text-red-500">
                                            Se o problema persistir, verifique o console do navegador para obter mais detalhes
                                            ou entre em contato com o suporte.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#9e46d3]"></div>
                                </div>
                            ) : (
                                <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                    {filteredProfiles.length === 0 ? (
                                        <div className="text-center py-6 text-gray-500">
                                            <p>Nenhum perfil encontrado</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {filteredProfiles.map((profile) => (
                                                <div
                                                    key={profile.id}
                                                    className={`flex items-center px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors relative group ${
                                                        currentProfile?.id === profile.id ? 'bg-[#9e46d3]/5 hover:bg-[#9e46d3]/10' : ''
                                                    }`}
                                                    onClick={() => handleProfileSelect(profile)}
                                                >
                                                    {currentProfile?.id === profile.id && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#9e46d3]"></div>
                                                    )}
                                                    
                                                    <div className="relative mr-3">
                                                        {profile.profilePicUrl && !imgErrors[profile.id] ? (
                                                            <div className={`${currentProfile?.id === profile.id ? 'ring-2 ring-[#9e46d3]' : 'ring-1 ring-gray-200'} rounded-full`}>
                                                                <img
                                                                    src={profile.profilePicUrl}
                                                                    alt={profile.username}
                                                                    className="w-12 h-12 rounded-full object-cover"
                                                                    onError={() => handleImgError(profile.id)}
                                                                    referrerPolicy="no-referrer"
                                                                    crossOrigin="anonymous"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className={`w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center ${
                                                                currentProfile?.id === profile.id ? 'ring-2 ring-[#9e46d3]' : 'ring-1 ring-gray-200'
                                                            }`}>
                                                                <Instagram className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-900 truncate">@{profile.username}</div>
                                                        <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                                            <span className="inline-block bg-[#9e46d3]/10 text-[#9e46d3] text-xs px-2 py-0.5 rounded-full">
                                                                {profile.followersCount.toLocaleString()} seguidores
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {currentProfile?.id === profile.id && (
                                                            <div className="h-6 w-6 rounded-full bg-[#9e46d3]/10 flex items-center justify-center">
                                                                <ArrowRight className="h-3.5 w-3.5 text-[#9e46d3]" />
                                                            </div>
                                                        )}
                                                        
                                                        <button
                                                            onClick={(e) => handleDeleteClick(e, profile.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Excluir perfil"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        {currentProfile ? (
                            <div className="space-y-8">
                                <InstagramProfile profile={mapProfileToProps(currentProfile)} />
                                <InstagramPosts posts={mapPostsToProps(posts)} />
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 text-center transform transition-all duration-500 hover:shadow-lg">
                                <div className="text-center py-10">
                                    <div className="bg-gray-50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
                                        <Instagram className="h-10 w-10 text-[#9e46d3]/40" />
                                    </div>
                                    <h3 className="text-xl font-medium text-gray-800 mb-2">Selecione um perfil</h3>
                                    <p className="text-gray-500">Escolha um perfil na lista à esquerda para visualizar os detalhes e análises.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {profileToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto transition-all duration-300">
                    <div 
                        className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center text-red-600">
                                <div className="bg-red-100 p-2 rounded-lg mr-3">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-medium">Excluir Perfil</h3>
                            </div>
                            <button 
                                onClick={handleCancelDelete}
                                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="mb-5 text-gray-600">
                            Tem certeza de que deseja excluir este perfil? Esta ação não pode ser desfeita, e todos os dados associados serão removidos permanentemente.
                        </p>

                        {deleteError && (
                            <div className="mb-5 p-4 text-sm text-red-600 bg-red-50 rounded-lg flex items-start">
                                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium">Falha ao excluir:</div>
                                    <div>{deleteError}</div>
                                    <div className="mt-2 text-xs">
                                        Verifique se você tem permissões para excluir este perfil.
                                        Mais detalhes estão disponíveis no console do navegador.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={handleCancelDelete}
                                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9e46d3]"
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader className="animate-spin h-4 w-4 mr-2" />
                                        Excluindo...
                                    </>
                                ) : (
                                    'Excluir Perfil'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal component */}
            <InstagramProfileModal isOpen={isProfileModalOpen} onClose={handleCloseProfileModal} />
        </div>
    );
}