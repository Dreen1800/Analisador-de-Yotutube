import { useState, useEffect } from 'react';
import { Instagram, Search, Loader, X, RefreshCw, Check, AlertCircle, Clock, Info, UserPlus, ExternalLink } from 'lucide-react';
import { useInstagramStore, ScrapingJobStatus } from '../stores/instagramStore';

interface InstagramProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InstagramProfileModal({ isOpen, onClose }: InstagramProfileModalProps) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const {
        scrapeProfile,
        isLoading,
        error: storeError,
        activeScrapingJobs,
        currentProfile,
        fetchPosts,
        checkActiveScrapingJobs
    } = useInstagramStore();

    // Animation for modal entry/exit
    useEffect(() => {
        if (isOpen) {
            // Small delay for animation
            setTimeout(() => {
                setIsModalVisible(true);
            }, 50);
        } else {
            setIsModalVisible(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) return;

        setLoading(true);
        setError(null);

        try {
            await scrapeProfile(username.trim());
            setUsername('');
        } catch (err: any) {
            setError(err.message || 'Erro ao analisar perfil do Instagram');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshStatus = async () => {
        setCheckingStatus(true);
        try {
            await checkActiveScrapingJobs();

            // If we have active jobs, show a loading message
            if (activeScrapingJobs.length > 0) {
                // Find the job related to the current profile if any
                const currentProfileJob = currentProfile
                    ? activeScrapingJobs.find(job => job.profile_username === currentProfile.username)
                    : null;

                if (currentProfileJob && currentProfileJob.status === 'COMPLETED' && currentProfile) {
                    // If job succeeded and we have a current profile, refresh its posts
                    await fetchPosts(currentProfile.id);
                }
            }
        } catch (error) {
            console.error('Error checking job status:', error);
        } finally {
            setTimeout(() => setCheckingStatus(false), 1000);
        }
    };

    const hasActiveJobs = activeScrapingJobs.length > 0;

    // Get job status icon and color
    const getJobStatusInfo = (status: ScrapingJobStatus, errorMessage?: string | null) => {
        // Verificar se é um job sendo reprocessado
        const isReprocessing = errorMessage && errorMessage.includes('Reprocessando dados');

        if (isReprocessing) {
            return {
                icon: <RefreshCw className="h-4 w-4 text-white animate-spin" />,
                bgColor: 'bg-blue-500',
                text: 'Reprocessando',
                textColor: 'text-blue-600'
            };
        }

        switch (status) {
            case 'COMPLETED':
                return {
                    icon: <Check className="h-4 w-4 text-white" />,
                    bgColor: 'bg-green-500',
                    text: 'Concluído',
                    textColor: 'text-green-600'
                };
            case 'APIFY_FAILED':
            case 'FAILED_PROCESSING':
                return {
                    icon: <AlertCircle className="h-4 w-4 text-white" />,
                    bgColor: 'bg-red-500',
                    text: 'Falhou',
                    textColor: 'text-red-600'
                };
            case 'APIFY_TIMED_OUT':
                return {
                    icon: <Clock className="h-4 w-4 text-white" />,
                    bgColor: 'bg-orange-500',
                    text: 'Tempo Esgotado',
                    textColor: 'text-orange-600'
                };
            case 'PENDING_APIFY':
            case 'PROCESSING_APIFY':
            case 'APIFY_SUCCEEDED': // Considered as still processing until data is fetched
            case 'PROCESSING_DATA':
            default:
                return {
                    icon: <Loader className="h-4 w-4 text-white animate-spin" />,
                    bgColor: 'bg-[#9e46d3]',
                    text: 'Processando...',
                    textColor: 'text-[#9e46d3]'
                };
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'
                }`}
            onClick={onClose}
        >
            <div
                className={`relative bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl transition-all duration-300 transform ${isModalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with gradient */}
                <div className="relative h-16 bg-gradient-to-r from-[#9e46d3] to-[#b464e0] flex items-center px-6">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute inset-0 backdrop-blur-sm bg-white/10"></div>

                    {/* Floating circles for decoration */}
                    <div className="absolute top-3 right-12 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md"></div>
                    <div className="absolute top-8 right-24 w-4 h-4 rounded-full bg-white/30 backdrop-blur-md"></div>

                    <div className="flex items-center z-10">
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full mr-3">
                            <Instagram className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Adicionar Perfil do Instagram</h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/20 transition-colors z-10"
                        aria-label="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 mb-6">
                        Digite um nome de usuário do Instagram para analisar seu perfil e conteúdo.
                    </p>

                    <form onSubmit={handleSubmit} className="mb-6">
                        <div className="relative mb-3">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Digite o nome de usuário do Instagram"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9e46d3] focus:border-[#9e46d3] transition-all duration-200"
                                disabled={loading || isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || isLoading || !username.trim()}
                            className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-[#9e46d3] hover:bg-[#8a3dbd] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9e46d3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {loading || isLoading ? (
                                <>
                                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                    Analisando...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Analisar Perfil
                                </>
                            )}
                        </button>
                    </form>

                    {(error || storeError) && (
                        <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 flex items-start">
                            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-red-500" />
                            <div>
                                <div className="font-medium">Erro:</div>
                                <div>{error || storeError}</div>
                            </div>
                        </div>
                    )}

                    {/* Active scraping jobs status */}
                    {hasActiveJobs && (
                        <div className="mb-6">
                            <div className="bg-[#9e46d3]/5 border border-[#9e46d3]/20 rounded-xl p-5">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <div className="bg-[#9e46d3]/10 p-2 rounded-full">
                                            <Clock className="h-5 w-5 text-[#9e46d3]" />
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-base font-medium text-gray-900">
                                            Status da Análise
                                        </h3>
                                        <div className="mt-3">
                                            <ul className="divide-y divide-gray-100">
                                                {activeScrapingJobs.map(job => {
                                                    const { icon, bgColor, text, textColor } = getJobStatusInfo(job.status, job.error_message);
                                                    return (
                                                        <li key={job.id} className="py-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center">
                                                                    <div className={`h-6 w-6 rounded-full ${bgColor} flex items-center justify-center mr-3`}>
                                                                        {icon}
                                                                    </div>
                                                                    <span className="font-medium">@{job.profile_username}</span>
                                                                </div>
                                                                <div className={`text-sm font-medium ${textColor} px-2.5 py-1 rounded-full bg-gray-50`}>
                                                                    {text}
                                                                </div>
                                                            </div>
                                                            {job.error_message && (
                                                                <div className="mt-1 ml-9 text-sm text-red-600">
                                                                    {job.error_message}
                                                                </div>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                        <div className="mt-4 flex justify-between items-center">
                                            <button
                                                type="button"
                                                onClick={handleRefreshStatus}
                                                disabled={checkingStatus}
                                                className="inline-flex items-center px-3 py-1.5 border border-[#9e46d3]/20 text-sm font-medium rounded-lg text-[#9e46d3] bg-[#9e46d3]/10 hover:bg-[#9e46d3]/20 focus:outline-none disabled:opacity-50 transition-colors duration-200"
                                            >
                                                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                                                {checkingStatus ? 'Verificando...' : 'Atualizar Status'}
                                            </button>

                                            <a
                                                href="https://www.instagram.com/"
                                                target="_blank"
                                                rel="noreferrer noopener"
                                                className="inline-flex items-center text-sm text-gray-500 hover:text-[#9e46d3]"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                                Abrir Instagram
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9e46d3] transition-colors duration-200"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}