import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChannelStore } from '../stores/channelStore';
import { useApiKeyStore } from '../stores/apiKeyStore';
import { createDateFilter } from '../services/youtubeService';
import ChannelHeader from './ChannelHeader';
import VideoList from './VideoList';
import VideoGallery from './VideoGallery';
import EngagementChart from './EngagementChart';
import ViewsDurationChart from './ViewsDurationChart';
import ExportOptions from './ExportOptions';
import CompetitorAnalysis from './CompetitorAnalysis';
import ApiKeysModal from './ApiKeysModal';
import { Search, AlertCircle, Settings, BarChart2, Grid, List, Youtube, Loader, X, Calendar } from 'lucide-react';

interface ChannelAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId?: string;
}

interface AnalysisOptions {
    maxVideos: number;
    sortBy: 'date' | 'views' | 'engagement';
    includeShorts: boolean;
    dateFilter?: {
        publishedAfter?: string;
        publishedBefore?: string;
    };
}

const ChannelAnalysisModal = ({ isOpen, onClose, channelId }: ChannelAnalysisModalProps) => {
    const navigate = useNavigate();
    const {
        currentChannel,
        currentAnalysis,
        isLoading,
        error,
        analyzeChannel,
        fetchChannelAnalysis,
        clearCurrentChannel
    } = useChannelStore();
    const { apiKeys, currentKey } = useApiKeyStore();

    const [channelUrl, setChannelUrl] = useState('');
    const [displayMode, setDisplayMode] = useState<'list' | 'gallery'>('list');
    const [activeTab, setActiveTab] = useState<'videos' | 'competitors'>('videos');
    const [showOptions, setShowOptions] = useState(false);
    const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
    const [options, setOptions] = useState<AnalysisOptions>({
        maxVideos: 50,
        sortBy: 'views',
        includeShorts: false
    });
    const [dateFilterType, setDateFilterType] = useState<'none' | 'preset' | 'custom'>('none');
    const [presetFilter, setPresetFilter] = useState<string>('lastMonth');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            if (channelId) {
                fetchChannelAnalysis(channelId);
            } else {
                clearCurrentChannel();
            }
        }
    }, [isOpen, channelId, fetchChannelAnalysis, clearCurrentChannel]);

    const handleAnalyzeChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!channelUrl) return;

        // Aplicar filtros de data baseado na seleção
        let finalOptions = { ...options };

        if (dateFilterType === 'preset') {
            switch (presetFilter) {
                case 'lastWeek':
                    finalOptions.dateFilter = createDateFilter.thisWeek();
                    break;
                case 'lastMonth':
                    finalOptions.dateFilter = createDateFilter.thisMonth();
                    break;
                case 'last3Months':
                    finalOptions.dateFilter = createDateFilter.lastMonths(3);
                    break;
                case 'last6Months':
                    finalOptions.dateFilter = createDateFilter.lastMonths(6);
                    break;
                case 'lastYear':
                    finalOptions.dateFilter = createDateFilter.thisYear();
                    break;
                case 'last30Days':
                    finalOptions.dateFilter = createDateFilter.lastDays(30);
                    break;
                case 'last90Days':
                    finalOptions.dateFilter = createDateFilter.lastDays(90);
                    break;
            }
        } else if (dateFilterType === 'custom') {
            if (customStartDate || customEndDate) {
                finalOptions.dateFilter = {};
                if (customStartDate) {
                    finalOptions.dateFilter.publishedAfter = new Date(customStartDate).toISOString();
                }
                if (customEndDate) {
                    finalOptions.dateFilter.publishedBefore = new Date(customEndDate).toISOString();
                }
            }
        }

        try {
            await analyzeChannel(channelUrl, finalOptions);
            setChannelUrl('');
        } catch (error) {
            console.error('Erro ao analisar canal:', error);
        }
    };

    const openApiKeysModal = () => {
        setIsApiKeysModalOpen(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
            <div className="relative bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {currentChannel ? `Análise do Canal: ${currentChannel.title}` : 'Análise de Canal do YouTube'}
                    </h1>
                    {currentChannel && (
                        <p className="text-gray-600 mb-4">
                            Explore métricas, visualizações e engajamento para entender o desempenho do canal
                        </p>
                    )}

                    {/* Aviso de Chave API */}
                    {apiKeys.length === 0 && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-5 mb-6 rounded-r-lg shadow-sm">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                    <AlertCircle className="h-6 w-6 text-amber-500" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-amber-800">Chave API necessária</h3>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Você precisa adicionar uma chave da API do YouTube antes de analisar canais.
                                        <button
                                            onClick={openApiKeysModal}
                                            className="ml-1 font-medium underline hover:text-amber-800"
                                        >
                                            Configurar chave API
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col justify-center items-center h-64 bg-white p-8">
                            <Loader className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                            <p className="text-gray-700 text-lg">Analisando dados do canal...</p>
                            <p className="text-gray-500 text-sm mt-2">Isso pode levar alguns instantes, dependendo do tamanho do canal.</p>
                        </div>
                    ) : (
                        <>
                            {/* Formulário de Busca de Canal */}
                            {!currentChannel && (
                                <div className="bg-white rounded-xl p-6 mb-6 border border-gray-100">
                                    <div className="flex items-center mb-6">
                                        <Youtube className="w-7 h-7 text-purple-600 mr-3" />
                                        <h2 className="text-xl font-semibold text-gray-800">Analisar Canal do YouTube</h2>
                                    </div>

                                    <form onSubmit={handleAnalyzeChannel} className="space-y-6">
                                        <div>
                                            <label htmlFor="channelUrl" className="block text-sm font-medium text-gray-700 mb-1">
                                                URL do Canal
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                    <Search className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="channelUrl"
                                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 p-3 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                    placeholder="https://www.youtube.com/c/NomeDoCanal"
                                                    value={channelUrl}
                                                    onChange={(e) => setChannelUrl(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <p className="mt-1.5 text-sm text-gray-500">
                                                Insira qualquer formato de URL de canal do YouTube (ex: /channel/ID, /c/NOME, /@NOME, /user/NOME)
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Chave da API
                                            </label>
                                            <select
                                                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-3 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                disabled={apiKeys.length === 0}
                                            >
                                                {currentKey ? (
                                                    <option>{currentKey.name} (Chave API terminando com ...{currentKey.key.slice(-5)})</option>
                                                ) : (
                                                    <option>Nenhuma chave API disponível</option>
                                                )}
                                            </select>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => setShowOptions(!showOptions)}
                                                className="flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
                                            >
                                                <Settings className="w-4 h-4 mr-2" />
                                                {showOptions ? 'Ocultar Opções de Análise' : 'Mostrar Opções de Análise'}
                                            </button>

                                            {showOptions && (
                                                <div className="mt-5 space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div>
                                                        <label htmlFor="maxVideos" className="block text-sm font-medium text-gray-700 mb-1.5">
                                                            Quantidade de Vídeos para Analisar
                                                        </label>
                                                        <select
                                                            id="maxVideos"
                                                            value={options.maxVideos}
                                                            onChange={(e) => setOptions({ ...options, maxVideos: Number(e.target.value) })}
                                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                        >
                                                            <option value={25}>25 vídeos</option>
                                                            <option value={50}>50 vídeos</option>
                                                            <option value={100}>100 vídeos</option>
                                                            <option value={200}>200 vídeos</option>
                                                        </select>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Mais vídeos fornecem uma análise mais completa, mas demoram mais tempo para processar.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1.5">
                                                            Ordenar Vídeos Por
                                                        </label>
                                                        <select
                                                            id="sortBy"
                                                            value={options.sortBy}
                                                            onChange={(e) => setOptions({ ...options, sortBy: e.target.value as 'date' | 'views' | 'engagement' })}
                                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                        >
                                                            <option value="views">Mais Visualizados</option>
                                                            <option value="date">Mais Recentes</option>
                                                            <option value="engagement">Maior Engajamento</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center pt-2">
                                                        <input
                                                            type="checkbox"
                                                            id="includeShorts"
                                                            checked={options.includeShorts}
                                                            onChange={(e) => setOptions({ ...options, includeShorts: e.target.checked })}
                                                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 transition-all"
                                                        />
                                                        <label htmlFor="includeShorts" className="ml-2 block text-sm text-gray-700">
                                                            Incluir YouTube Shorts
                                                        </label>
                                                        <div className="ml-2 group relative">
                                                            <span className="cursor-help text-gray-400">ℹ️</span>
                                                            <div className="opacity-0 bg-gray-800 text-white text-xs rounded p-2 absolute z-10 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 w-60 pointer-events-none">
                                                                Os Shorts têm um formato diferente e podem afetar os resultados da análise.
                                                                <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                                                                    <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Filtros de Data */}
                                                    <div className="pt-4 border-t border-gray-200">
                                                        <div className="flex items-center mb-3">
                                                            <Calendar className="w-4 h-4 text-gray-600 mr-2" />
                                                            <label className="block text-sm font-medium text-gray-700">
                                                                Filtrar por Data de Publicação
                                                            </label>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div className="flex items-center space-x-4">
                                                                <label className="flex items-center">
                                                                    <input
                                                                        type="radio"
                                                                        name="dateFilter"
                                                                        value="none"
                                                                        checked={dateFilterType === 'none'}
                                                                        onChange={(e) => setDateFilterType(e.target.value as 'none' | 'preset' | 'custom')}
                                                                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                                                    />
                                                                    <span className="ml-2 text-sm text-gray-700">Todos os vídeos</span>
                                                                </label>
                                                                <label className="flex items-center">
                                                                    <input
                                                                        type="radio"
                                                                        name="dateFilter"
                                                                        value="preset"
                                                                        checked={dateFilterType === 'preset'}
                                                                        onChange={(e) => setDateFilterType(e.target.value as 'none' | 'preset' | 'custom')}
                                                                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                                                    />
                                                                    <span className="ml-2 text-sm text-gray-700">Período predefinido</span>
                                                                </label>
                                                                <label className="flex items-center">
                                                                    <input
                                                                        type="radio"
                                                                        name="dateFilter"
                                                                        value="custom"
                                                                        checked={dateFilterType === 'custom'}
                                                                        onChange={(e) => setDateFilterType(e.target.value as 'none' | 'preset' | 'custom')}
                                                                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                                                    />
                                                                    <span className="ml-2 text-sm text-gray-700">Período personalizado</span>
                                                                </label>
                                                            </div>

                                                            {dateFilterType === 'preset' && (
                                                                <div>
                                                                    <select
                                                                        value={presetFilter}
                                                                        onChange={(e) => setPresetFilter(e.target.value)}
                                                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                                    >
                                                                        <option value="lastWeek">Esta semana</option>
                                                                        <option value="lastMonth">Este mês</option>
                                                                        <option value="last30Days">Últimos 30 dias</option>
                                                                        <option value="last3Months">Últimos 3 meses</option>
                                                                        <option value="last6Months">Últimos 6 meses</option>
                                                                        <option value="last90Days">Últimos 90 dias</option>
                                                                        <option value="lastYear">Este ano</option>
                                                                    </select>
                                                                </div>
                                                            )}

                                                            {dateFilterType === 'custom' && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label htmlFor="startDate" className="block text-xs font-medium text-gray-600 mb-1">
                                                                            Data de início (opcional)
                                                                        </label>
                                                                        <input
                                                                            type="date"
                                                                            id="startDate"
                                                                            value={customStartDate}
                                                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label htmlFor="endDate" className="block text-xs font-medium text-gray-600 mb-1">
                                                                            Data de fim (opcional)
                                                                        </label>
                                                                        <input
                                                                            type="date"
                                                                            id="endDate"
                                                                            value={customEndDate}
                                                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {dateFilterType !== 'none' && (
                                                                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-200">
                                                                    <strong>💡 Dica:</strong> Filtrar por data pode reduzir significativamente o número de vídeos analisados,
                                                                    especialmente para canais com pouco conteúdo recente.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!currentKey || isLoading}
                                            className="inline-flex items-center px-5 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <BarChart2 className="w-5 h-5 mr-2" />
                                            {isLoading ? 'Analisando...' : 'Analisar Canal'}
                                        </button>

                                        {error && (
                                            <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200 mt-4">
                                                <div className="flex">
                                                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                                                    <span>{error}</span>
                                                </div>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            )}

                            {/* Resultados da Análise do Canal */}
                            {currentChannel && currentAnalysis && (
                                <>
                                    <ChannelHeader
                                        channel={currentChannel}
                                        analysisDate={currentAnalysis.analysis_date}
                                    />

                                    {/* Resumo dos Filtros Aplicados */}
                                    {(dateFilterType !== 'none' || !options.includeShorts || options.maxVideos !== 50) && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                            <h3 className="text-sm font-medium text-blue-800 mb-2">Filtros Aplicados na Análise:</h3>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {options.maxVideos !== 50 && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        {options.maxVideos} vídeos
                                                    </span>
                                                )}
                                                {!options.includeShorts && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        Sem Shorts
                                                    </span>
                                                )}
                                                {dateFilterType === 'preset' && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        📅 {presetFilter === 'lastWeek' ? 'Esta semana' :
                                                            presetFilter === 'lastMonth' ? 'Este mês' :
                                                                presetFilter === 'last30Days' ? 'Últimos 30 dias' :
                                                                    presetFilter === 'last3Months' ? 'Últimos 3 meses' :
                                                                        presetFilter === 'last6Months' ? 'Últimos 6 meses' :
                                                                            presetFilter === 'last90Days' ? 'Últimos 90 dias' :
                                                                                presetFilter === 'lastYear' ? 'Este ano' : presetFilter}
                                                    </span>
                                                )}
                                                {dateFilterType === 'custom' && (customStartDate || customEndDate) && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        📅 {customStartDate && `De: ${new Date(customStartDate).toLocaleDateString('pt-BR')}`}
                                                        {customStartDate && customEndDate && ' - '}
                                                        {customEndDate && `Até: ${new Date(customEndDate).toLocaleDateString('pt-BR')}`}
                                                    </span>
                                                )}
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    Ordenado por: {options.sortBy === 'views' ? 'Visualizações' :
                                                        options.sortBy === 'date' ? 'Data' : 'Engajamento'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                                <h3 className="font-medium text-gray-800">Engajamento por Vídeo</h3>
                                            </div>
                                            <div className="p-4">
                                                <EngagementChart videos={currentAnalysis.videos} />
                                            </div>
                                        </div>
                                        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                                <h3 className="font-medium text-gray-800">Visualizações x Duração</h3>
                                            </div>
                                            <div className="p-4">
                                                <ViewsDurationChart videos={currentAnalysis.videos} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabs para Análise de Vídeos e Análise de Concorrentes */}
                                    <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-6 border border-gray-100">
                                        <div className="border-b border-gray-100">
                                            <div className="flex">
                                                <button
                                                    onClick={() => setActiveTab('videos')}
                                                    className={`px-6 py-4 font-medium text-sm focus:outline-none transition-colors ${activeTab === 'videos'
                                                        ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                                                        : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                                                        }`}
                                                >
                                                    Análise de Vídeos
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('competitors')}
                                                    className={`px-6 py-4 font-medium text-sm focus:outline-none transition-colors ${activeTab === 'competitors'
                                                        ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                                                        : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                                                        }`}
                                                >
                                                    Análise de Concorrentes com IA
                                                </button>
                                            </div>
                                        </div>

                                        {activeTab === 'videos' && (
                                            <div>
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-100">
                                                    <h2 className="text-xl font-semibold text-gray-800">Análise de Vídeos</h2>

                                                    <div className="flex space-x-2 mt-4 md:mt-0">
                                                        <button
                                                            onClick={() => setDisplayMode('list')}
                                                            className={`inline-flex items-center px-4 py-2 text-sm rounded-lg transition-all ${displayMode === 'list'
                                                                ? 'bg-purple-100 text-purple-700 font-medium'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            <List className="w-4 h-4 mr-1.5" />
                                                            Lista
                                                        </button>
                                                        <button
                                                            onClick={() => setDisplayMode('gallery')}
                                                            className={`inline-flex items-center px-4 py-2 text-sm rounded-lg transition-all ${displayMode === 'gallery'
                                                                ? 'bg-purple-100 text-purple-700 font-medium'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            <Grid className="w-4 h-4 mr-1.5" />
                                                            Galeria
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-6">
                                                    {displayMode === 'list' ? (
                                                        <VideoList videos={currentAnalysis.videos} />
                                                    ) : (
                                                        <VideoGallery videos={currentAnalysis.videos} />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'competitors' && (
                                            <CompetitorAnalysis
                                                channelId={currentChannel.channel_id}
                                                videoData={currentAnalysis.videos}
                                            />
                                        )}
                                    </div>

                                    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100 p-6 mb-4">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Exportar Análise</h2>
                                        <ExportOptions videos={currentAnalysis.videos} channelTitle={currentChannel.title} />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal de Chaves API */}
            <ApiKeysModal
                isOpen={isApiKeysModalOpen}
                onClose={() => setIsApiKeysModalOpen(false)}
            />
        </div>
    );
};

export default ChannelAnalysisModal; 