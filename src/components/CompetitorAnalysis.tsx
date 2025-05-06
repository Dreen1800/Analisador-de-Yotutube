import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApiKeyStore } from '../stores/apiKeyStore';
import { Sparkles, Loader, PlusCircle, Trash2, Brain, AlertCircle, Info } from 'lucide-react';
import axios from 'axios';

interface CompetitorAnalysisProps {
  channelId: string;
  videoData: any[];
}

interface Competitor {
  id: string;
  channel_id: string;
  title: string;
}

interface AiAnalysisResult {
  id: string;
  created_at: string;
  analysis: {
    trends: string[];
    patterns: string[];
    viralPotential: string[];
    contentIdeas: string[];
  };
}

const CompetitorAnalysis = ({ channelId, videoData }: CompetitorAnalysisProps) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyError, setShowApiKeyError] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const { apiKeys } = useApiKeyStore();

  useEffect(() => {
    fetchCompetitors();
    fetchExistingAnalysis();
  }, [channelId]);

  const fetchCompetitors = async () => {
    try {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('parent_channel_id', channelId);
      
      if (error) throw error;
      
      setCompetitors(data || []);
    } catch (err) {
      console.error('Erro ao buscar concorrentes:', err);
    }
  };

  const fetchExistingAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // No rows returned is not a real error
          throw error;
        }
      } else {
        setAiAnalysis(data);
      }
    } catch (err) {
      console.error('Erro ao buscar análise existente:', err);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitorUrl) return;
    
    setIsAddingCompetitor(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      // Get the first YouTube API key
      if (apiKeys.length === 0) {
        throw new Error('Nenhuma chave de API do YouTube encontrada');
      }
      
      const youtubeApiKey = apiKeys[0].key;
      
      // Extract channel ID or handle from URL
      const patterns = {
        channel: /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i,
        custom: /youtube\.com\/c\/([^\/\s?&]+)/i,
        handle: /youtube\.com\/@([^\/\s?&]+)/i,
        user: /youtube\.com\/user\/([^\/\s?&]+)/i,
        handleOnly: /@([^\/\s?&]+)/i
      };
      
      let competitor_id = '';
      let searchTerm = '';
      
      // Try to match direct channel ID first
      const channelMatch = competitorUrl.match(patterns.channel);
      if (channelMatch) {
        competitor_id = channelMatch[1];
      } else if (competitorUrl.match(patterns.custom)) {
        searchTerm = competitorUrl.match(patterns.custom)![1];
      } else if (competitorUrl.match(patterns.handle)) {
        searchTerm = competitorUrl.match(patterns.handle)![1];
      } else if (competitorUrl.match(patterns.user)) {
        searchTerm = competitorUrl.match(patterns.user)![1];
      } else if (competitorUrl.match(patterns.handleOnly)) {
        searchTerm = competitorUrl.match(patterns.handleOnly)![1];
      } else {
        // Assume it's a search term if no pattern matches
        searchTerm = competitorUrl;
      }
      
      // If we have a direct ID, use it
      if (!competitor_id && searchTerm) {
        // Otherwise, search for the channel
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: searchTerm,
            type: 'channel',
            maxResults: 1,
            key: youtubeApiKey
          }
        });
        
        if (response.data.items?.length > 0) {
          competitor_id = response.data.items[0].id.channelId;
        } else {
          throw new Error('Canal não encontrado');
        }
      }
      
      // Get channel details
      const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet',
          id: competitor_id,
          key: youtubeApiKey
        }
      });
      
      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('Detalhes do canal não encontrados');
      }
      
      const channelDetails = channelResponse.data.items[0];
      
      // Add the competitor to the database
      const { data, error } = await supabase
        .from('competitors')
        .insert([
          {
            channel_id: competitor_id,
            title: channelDetails.snippet.title,
            parent_channel_id: channelId,
            user_id: user.id
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Update the competitors list
      setCompetitors([...(data as Competitor[]), ...competitors]);
      setCompetitorUrl('');
    } catch (err) {
      setError((err as Error).message || 'Erro ao adicionar concorrente');
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update the competitors list
      setCompetitors(competitors.filter(comp => comp.id !== id));
    } catch (err) {
      console.error('Erro ao excluir concorrente:', err);
    }
  };

  const generateAiAnalysis = async () => {
    if (!openaiApiKey) {
      setShowApiKeyError(true);
      return;
    }
    
    setIsGeneratingAnalysis(true);
    setError(null);
    setShowApiKeyError(false);
    
    try {
      // Get competitor video data
      const competitorVideos = await Promise.all(
        competitors.map(async (competitor) => {
          const youtubeApiKey = apiKeys[0].key;
          
          // Get videos from competitor
          const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
              part: 'snippet',
              channelId: competitor.channel_id,
              maxResults: 15,
              order: 'viewCount',
              type: 'video',
              key: youtubeApiKey
            }
          });
          
          const videoIds = response.data.items.map((item: any) => item.id.videoId);
          
          // Get detailed video info
          const videoDetailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
              part: 'snippet,statistics',
              id: videoIds.join(','),
              key: youtubeApiKey
            }
          });
          
          return {
            channelTitle: competitor.title,
            videos: videoDetailsResponse.data.items.map((item: any) => ({
              title: item.snippet.title,
              description: item.snippet.description,
              viewCount: parseInt(item.statistics.viewCount),
              likeCount: parseInt(item.statistics.likeCount || '0'),
              commentCount: parseInt(item.statistics.commentCount || '0')
            }))
          };
        })
      );
      
      // Extract self channel data for comparison
      const ownChannelData = {
        videos: videoData.map(video => ({
          title: video.title,
          viewCount: video.view_count,
          likeCount: video.like_count,
          commentCount: video.comment_count
        }))
      };
      
      // Format data for the OpenAI API request
      const promptData = {
        competitors: competitorVideos,
        ownChannel: ownChannelData
      };
      
      console.log('Enviando dados para análise:', promptData);
      
      // Call OpenAI API
      const openAiResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Você é um analista de marketing especializado em conteúdo para YouTube. Sua tarefa é analisar dados de vídeos para identificar tendências e padrões que podem ser aproveitados para criar conteúdo viral."
            },
            {
              role: "user",
              content: `Analise estes dados de vídeos e forneça insights estratégicos para aproveitar as tendências de conteúdo viral. Dados: ${JSON.stringify(promptData)}`
            },
            {
              role: "system",
              content: "Por favor, forneça sua análise no seguinte formato JSON: { \"trends\": [lista de 3-5 tendências atuais observadas nos vídeos de maior sucesso], \"patterns\": [3-5 padrões de conteúdo ou formatos que funcionam bem], \"viralPotential\": [3-5 nichos ou tópicos específicos com alto potencial de viralização], \"contentIdeas\": [5-8 ideias concretas e detalhadas para vídeos que têm potencial viral baseadas na análise] }"
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          }
        }
      );
      
      console.log('Resposta da OpenAI:', openAiResponse.data);
      
      // Parse e validar a resposta
      let analysisResult;
      try {
        const content = openAiResponse.data.choices[0].message.content;
        console.log('Conteúdo da resposta:', content);
        
        // Tente extrair o JSON da resposta
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Formato JSON não encontrado na resposta');
        }
        
        // Verifique se todos os campos necessários existem
        if (!analysisResult.trends || !analysisResult.patterns || 
            !analysisResult.viralPotential || !analysisResult.contentIdeas) {
          throw new Error('Resposta incompleta da IA');
        }
        
        // Garanta que todos os campos são arrays
        analysisResult.trends = Array.isArray(analysisResult.trends) ? analysisResult.trends : [];
        analysisResult.patterns = Array.isArray(analysisResult.patterns) ? analysisResult.patterns : [];
        analysisResult.viralPotential = Array.isArray(analysisResult.viralPotential) ? analysisResult.viralPotential : [];
        analysisResult.contentIdeas = Array.isArray(analysisResult.contentIdeas) ? analysisResult.contentIdeas : [];
      } catch (err) {
        console.error('Erro ao processar resposta:', err);
        throw new Error('Erro ao processar resposta da IA');
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      // Save the analysis to the database
      const { data, error } = await supabase
        .from('ai_analyses')
        .insert([
          {
            channel_id: channelId,
            analysis: analysisResult,
            user_id: user.id
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Update the state with the new analysis
      setAiAnalysis(data[0] as AiAnalysisResult);
    } catch (err) {
      console.error('Erro completo:', err);
      setError((err as Error).message || 'Erro ao gerar análise');
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  return (
    <div>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Análise de Concorrentes com IA</h2>
          </div>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Informações sobre esta ferramenta"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
        
        {showInfo && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-800">
            <p className="mb-2">
              <strong>Como usar a Análise de Concorrentes com IA:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Adicione canais concorrentes usando a URL ou nome do canal</li>
              <li>Insira sua chave API da OpenAI (obtenha em platform.openai.com)</li>
              <li>Clique em "Gerar Análise de Conteúdo Viral"</li>
              <li>Receba insights sobre tendências, padrões e ideias de conteúdo viral</li>
            </ol>
          </div>
        )}
        
        <p className="text-gray-600 mb-6">
          Adicione canais concorrentes e use inteligência artificial para identificar tendências e oportunidades de conteúdo viral
        </p>
        
        {/* Competitor Management */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Gerenciar Concorrentes</h3>
          
          <form onSubmit={handleAddCompetitor} className="mb-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="URL ou nome do canal concorrente"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  disabled={isAddingCompetitor}
                />
              </div>
              <button
                type="submit"
                disabled={isAddingCompetitor || !competitorUrl}
                className="px-5 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px]"
              >
                {isAddingCompetitor ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Adicionar Canal
                  </>
                )}
              </button>
            </div>
          </form>
          
          {error && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Canais Concorrentes</h4>
            
            {competitors.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Nenhum concorrente adicionado. Adicione canais para começar a análise.
              </p>
            ) : (
              <ul className="space-y-2">
                {competitors.map((competitor) => (
                  <li key={competitor.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-all">
                    <span className="font-medium text-gray-800">{competitor.title}</span>
                    <button
                      onClick={() => handleDeleteCompetitor(competitor.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Remover concorrente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* OpenAI API Key */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
            <Brain className="w-5 h-5 text-purple-600 mr-2" />
            Configuração da API OpenAI
          </h3>
          
          <div className="flex flex-col md:flex-row gap-3 mb-2">
            <div className="flex-grow">
              <input
                type="password"
                placeholder="Insira sua chave API da OpenAI"
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                  showApiKeyError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
            </div>
          </div>
          
          {showApiKeyError && (
            <p className="text-sm text-red-600 mt-1 ml-1">
              Uma chave API da OpenAI é necessária para gerar análises com IA
            </p>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            Sua chave API é usada apenas para esta análise e não é armazenada permanentemente.
            Obtenha uma chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">platform.openai.com</a>
          </p>
        </div>
        
        {/* Generate Analysis Button */}
        <div className="mb-4">
          <button
            onClick={generateAiAnalysis}
            disabled={isGeneratingAnalysis || competitors.length === 0}
            className="w-full px-5 py-4 bg-gradient-to-r from-purple-600 to-purple-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
          >
            {isGeneratingAnalysis ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Gerando análise com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {aiAnalysis ? 'Atualizar Análise de Conteúdo Viral' : 'Gerar Análise de Conteúdo Viral'}
              </>
            )}
          </button>
          
          <p className="text-xs text-center text-gray-500 mt-2">
            Esta análise utiliza GPT-4o para processar dados de vídeos virais e gerar insights estratégicos
          </p>
        </div>
      </div>
      
      {/* Analysis Results */}
      {aiAnalysis && (
        <div className="p-6 bg-gradient-to-r from-purple-50 to-purple-50">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-1 flex items-center">
              <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
              Análise de Potencial Viral
            </h3>
            <p className="text-sm text-gray-600">
              Gerada em {new Date(aiAnalysis.created_at).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
              <h4 className="font-medium text-purple-700 mb-3">Tendências Identificadas</h4>
              <ul className="space-y-2">
                {aiAnalysis.analysis.trends.map((trend, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 w-6 h-6 rounded-full text-xs font-medium mr-2 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{trend}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
              <h4 className="font-medium text-purple-700 mb-3">Padrões de Conteúdo</h4>
              <ul className="space-y-2">
                {aiAnalysis.analysis.patterns.map((pattern, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 w-6 h-6 rounded-full text-xs font-medium mr-2 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{pattern}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100">
              <h4 className="font-medium text-blue-700 mb-3">Nichos com Potencial Viral</h4>
              <ul className="space-y-2">
                {aiAnalysis.analysis.viralPotential.map((potential, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 w-6 h-6 rounded-full text-xs font-medium mr-2 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{potential}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 md:col-span-2">
              <h4 className="font-medium text-green-700 mb-3">Ideias de Conteúdo com Potencial Viral</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {aiAnalysis.analysis.contentIdeas.map((idea, index) => (
                  <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center justify-center bg-green-100 text-green-800 w-6 h-6 rounded-full text-xs font-medium mr-2">
                        {index + 1}
                      </span>
                      <h5 className="font-medium text-green-800">Ideia de Vídeo</h5>
                    </div>
                    <p className="text-gray-700 text-sm">{idea}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorAnalysis;