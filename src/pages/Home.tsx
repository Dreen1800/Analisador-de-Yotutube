import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChannelStore } from '../stores/channelStore';
import ChannelHeader from '../components/ChannelHeader';
import VideoList from '../components/VideoList';
import VideoGallery from '../components/VideoGallery';
import EngagementChart from '../components/EngagementChart';
import ViewsDurationChart from '../components/ViewsDurationChart';
import { AlertCircle, Loader, Home as HomeIcon, Settings, List, Grid } from 'lucide-react';

interface AnalysisOptions {
  maxVideos: number;
  sortBy: 'date' | 'views' | 'engagement';
  includeShorts: boolean;
}

const Home = () => {
  const { getMainChannel, currentChannel, currentAnalysis, fetchChannelAnalysis, isLoading, error } = useChannelStore();
  const navigate = useNavigate();
  const [noMainChannel, setNoMainChannel] = useState(false);
  const [displayMode, setDisplayMode] = useState<'list' | 'gallery'>('list');
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<AnalysisOptions>({
    maxVideos: 50,
    sortBy: 'views',
    includeShorts: false
  });

  useEffect(() => {
    const loadMainChannel = async () => {
      const mainChannel = await getMainChannel();
      if (mainChannel) {
        fetchChannelAnalysis(mainChannel.channel_id);
      } else {
        setNoMainChannel(true);
      }
    };

    loadMainChannel();
  }, [getMainChannel, fetchChannelAnalysis]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col justify-center items-center h-64 bg-white shadow-lg rounded-xl p-8">
          <Loader className="w-12 h-12 text-purple-600 animate-spin mb-4" />
          <p className="text-gray-700 text-lg">Carregando dados do canal principal...</p>
        </div>
      </div>
    );
  }

  if (noMainChannel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HomeIcon className="w-8 h-8 text-purple-600 mr-3" />
            Início
          </h1>
          <p className="text-gray-600 mt-1">
            Acompanhe as métricas do seu canal principal
          </p>
        </div>

        <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-purple-50 mb-6">
            <Settings className="h-10 w-10 text-purple-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-3">Nenhum canal principal definido</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Vá até o Dashboard e defina um canal como principal para visualizar suas métricas aqui.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-5 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 shadow-md"
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-red-600 mb-2 font-medium">Erro ao carregar o canal principal</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentChannel || !currentAnalysis) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <HomeIcon className="w-8 h-8 text-purple-600 mr-3" />
          Início
        </h1>
        <p className="text-gray-600 mt-1">
          Acompanhe as métricas do seu canal principal
        </p>
      </div>

      <ChannelHeader
        channel={currentChannel}
        analysisDate={currentAnalysis.analysis_date}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

      <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Vídeos do Canal</h2>

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

        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            {showOptions ? 'Ocultar Opções de Filtro' : 'Mostrar Opções de Filtro'}
          </button>

          {showOptions && (
            <div className="mt-5 space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <label htmlFor="maxVideos" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Quantidade de Vídeos para Exibir
                </label>
                <select
                  id="maxVideos"
                  value={options.maxVideos}
                  onChange={(e) => setOptions({ ...options, maxVideos: Number(e.target.value) })}
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value={10}>10 vídeos</option>
                  <option value={25}>25 vídeos</option>
                  <option value={50}>50 vídeos</option>
                  <option value={100}>100 vídeos</option>
                </select>
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
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {displayMode === 'list' ? (
            <VideoList videos={currentAnalysis.videos.slice(0, options.maxVideos)} />
          ) : (
            <VideoGallery videos={currentAnalysis.videos.slice(0, options.maxVideos)} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;