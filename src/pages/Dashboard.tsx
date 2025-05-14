import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChannelStore } from '../stores/channelStore';
import { useApiKeyStore } from '../stores/apiKeyStore';
import ChannelCard from '../components/ChannelCard';
import ChannelAnalysisModal from '../components/ChannelAnalysisModal';
import ApiKeysModal from '../components/ApiKeysModal';
import { Search, Plus, Key, Youtube, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { channels, fetchChannels, isLoading } = useChannelStore();
  const { apiKeys, fetchApiKeys } = useApiKeyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchChannels();
    fetchApiKeys();
  }, [fetchChannels, fetchApiKeys]);

  const filteredChannels = channels.filter(
    channel => channel.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchChannels(), fetchApiKeys()]);
    setTimeout(() => setIsRefreshing(false), 800); // Pequeno atraso para feedback visual
  };

  const openAnalysisModal = (channelId?: string) => {
    setSelectedChannelId(channelId);
    setIsAnalysisModalOpen(true);
  };

  const closeAnalysisModal = () => {
    setIsAnalysisModalOpen(false);
    setSelectedChannelId(undefined);
  };

  const openApiKeysModal = () => {
    setIsApiKeysModalOpen(true);
  };

  const closeApiKeysModal = () => {
    setIsApiKeysModalOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Youtube className="w-8 h-8 text-purple-600 mr-3" />
            Canais
          </h1>
          <p className="text-gray-600 mt-1">
            Análise e acompanhamento de desempenho de canais do YouTube
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="mt-4 md:mt-0 inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all disabled:opacity-50"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Dados
            </>
          )}
        </button>
      </div>

      {/* Status da Chave API */}
      {apiKeys.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-amber-100 rounded-lg p-2">
              <Key className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Nenhuma chave de API encontrada</h3>
              <p className="text-sm text-amber-700 mt-1">
                Para começar a analisar canais, você precisa
                <button
                  onClick={openApiKeysModal}
                  className="font-medium underline text-amber-800 hover:text-amber-900 ml-1">
                  adicionar uma chave da API do YouTube
                </button>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pesquisa e Adição de Canal */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm"
            placeholder="Pesquisar canais..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          onClick={() => openAnalysisModal()}
          className="inline-flex items-center px-5 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 w-full md:w-auto justify-center shadow-md"
        >
          <Plus className="w-5 h-5 mr-2" />
          Analisar Novo Canal
        </button>
      </div>

      {/* Grade de Canais */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-purple-600 border-purple-200 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Carregando seus canais...</p>
          </div>
        </div>
      ) : filteredChannels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onAnalyzeClick={() => openAnalysisModal(channel.id)}
            />
          ))}
        </div>
      ) : channels.length > 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum canal encontrado</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Não encontramos canais correspondentes à sua pesquisa. Tente outros termos ou limpe a pesquisa.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            Limpar Pesquisa
          </button>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-purple-50 mb-6">
            <Youtube className="h-10 w-10 text-purple-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-3">Nenhum canal analisado ainda</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Comece analisando seu primeiro canal do YouTube para visualizar estatísticas e desempenho.
          </p>
          <button
            onClick={() => openAnalysisModal()}
            className="inline-flex items-center px-5 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Analisar Seu Primeiro Canal
          </button>

          {apiKeys.length === 0 && (
            <div className="mt-6 mx-auto max-w-md">
              <div className="flex items-start p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="ml-3 text-sm text-amber-700">
                  Você precisará
                  <button
                    onClick={openApiKeysModal}
                    className="font-medium underline mx-1">
                    configurar uma chave API
                  </button>
                  antes de poder analisar canais.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {channels.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Mostrando {filteredChannels.length} de {channels.length} canais analisados
          </p>
        </div>
      )}

      {/* Channel Analysis Modal */}
      <ChannelAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={closeAnalysisModal}
        channelId={selectedChannelId}
      />

      {/* API Keys Modal */}
      <ApiKeysModal
        isOpen={isApiKeysModalOpen}
        onClose={closeApiKeysModal}
      />
    </div>
  );
};

export default Dashboard;