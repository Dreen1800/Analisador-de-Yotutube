import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiKeyStore } from '../stores/apiKeyStore';
import { supabase } from '../lib/supabaseClient';
import { 
  Sparkles, 
  Brain, 
  AlertCircle, 
  Info, 
  Loader, 
  PlusCircle, 
  Trash2, 
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

interface Channel {
  id: string;
  channel_id: string;
  title: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
}

interface Competitor {
  id: string;
  channel_id: string;
  title: string;
  parent_channel_id: string;
  created_at: string;
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

const AiChannelAnalyzer = () => {
  const [userChannels, setUserChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyError, setShowApiKeyError] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [videoData, setVideoData] = useState<any[]>([]);
  const { apiKeys } = useApiKeyStore();
  const navigate = useNavigate();

  // Fetch user channels
  useEffect(() => {
    fetchUserChannels();
  }, []);

  const fetchUserChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUserChannels(data || []);
    } catch (err) {
      console.error('Error fetching channels:', err);
      setError('Failed to load your channels. Please try again.');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Fetch competitors when channel is selected
  useEffect(() => {
    if (selectedChannel) {
      fetchCompetitors(selectedChannel.channel_id);
      fetchExistingAnalysis(selectedChannel.channel_id);
      fetchVideoData(selectedChannel.channel_id);
    } else {
      setCompetitors([]);
      setAiAnalysis(null);
      setVideoData([]);
    }
  }, [selectedChannel]);

  const fetchCompetitors = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('parent_channel_id', channelId);
      
      if (error) throw error;
      
      setCompetitors(data || []);
    } catch (err) {
      console.error('Error fetching competitors:', err);
    }
  };

  const fetchExistingAnalysis = async (channelId: string) => {
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
      console.error('Error fetching existing analysis:', err);
    }
  };

  const fetchVideoData = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('channel_analyses')
        .select('videos')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      setVideoData(data.videos || []);
    } catch (err) {
      console.error('Error fetching video data:', err);
      setVideoData([]);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitorUrl || !selectedChannel) return;
    
    setIsAddingCompetitor(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get the first YouTube API key
      if (apiKeys.length === 0) {
        throw new Error('No YouTube API key found');
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
          throw new Error('Channel not found');
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
        throw new Error('Channel details not found');
      }
      
      const channelDetails = channelResponse.data.items[0];
      
      // Add the competitor to the database
      const { data, error } = await supabase
        .from('competitors')
        .insert([
          {
            channel_id: competitor_id,
            title: channelDetails.snippet.title,
            parent_channel_id: selectedChannel.channel_id,
            user_id: user.id
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Update the competitors list
      setCompetitors([...(data as Competitor[]), ...competitors]);
      setCompetitorUrl('');
    } catch (err) {
      setError((err as Error).message || 'Error adding competitor');
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
      console.error('Error deleting competitor:', err);
    }
  };

  const generateAiAnalysis = async () => {
    if (!openaiApiKey) {
      setShowApiKeyError(true);
      return;
    }
    
    if (!selectedChannel) {
      setError('Please select a channel first');
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
      
      // Call OpenAI API
      const openAiResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a YouTube marketing specialist and content analyst. Your task is to analyze video data and identify trends and patterns that can be leveraged to create viral content."
            },
            {
              role: "user",
              content: `Analyze these YouTube channel data and provide strategic insights for leveraging viral content trends. Data: ${JSON.stringify(promptData)}`
            },
            {
              role: "system",
              content: "Please provide your analysis in the following JSON format: { \"trends\": [list of 3-5 current trends observed in the most successful videos], \"patterns\": [3-5 content patterns or formats that work well], \"viralPotential\": [3-5 specific niches or topics with high viral potential], \"contentIdeas\": [5-8 concrete and detailed video ideas that have viral potential based on the analysis] }"
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
      
      // Parse and validate the response
      let analysisResult;
      try {
        const content = openAiResponse.data.choices[0].message.content;
        
        // Try to extract the JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('JSON format not found in response');
        }
        
        // Check if all required fields exist
        if (!analysisResult.trends || !analysisResult.patterns || 
            !analysisResult.viralPotential || !analysisResult.contentIdeas) {
          throw new Error('Incomplete AI response');
        }
        
        // Ensure all fields are arrays
        analysisResult.trends = Array.isArray(analysisResult.trends) ? analysisResult.trends : [];
        analysisResult.patterns = Array.isArray(analysisResult.patterns) ? analysisResult.patterns : [];
        analysisResult.viralPotential = Array.isArray(analysisResult.viralPotential) ? analysisResult.viralPotential : [];
        analysisResult.contentIdeas = Array.isArray(analysisResult.contentIdeas) ? analysisResult.contentIdeas : [];
      } catch (err) {
        console.error('Error processing response:', err);
        throw new Error('Error processing AI response');
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Save the analysis to the database
      const { data, error } = await supabase
        .from('ai_analyses')
        .insert([
          {
            channel_id: selectedChannel.channel_id,
            analysis: analysisResult,
            user_id: user.id
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Update the state with the new analysis
      setAiAnalysis(data[0] as AiAnalysisResult);
    } catch (err) {
      console.error('Complete error:', err);
      setError((err as Error).message || 'Error generating analysis');
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const handleChannelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const channelId = e.target.value;
    if (!channelId) {
      setSelectedChannel(null);
      return;
    }
    
    const channel = userChannels.find(c => c.channel_id === channelId);
    if (channel) {
      setSelectedChannel(channel);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Sparkles className="w-8 h-8 text-purple-600 mr-3" />
          AI Channel Analyzer
        </h1>
        <p className="text-gray-600 mt-1">
          Use AI to analyze competitors and generate content ideas with viral potential
        </p>
      </div>

      {apiKeys.length === 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-5 mb-8 rounded-r-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">YouTube API key required</h3>
              <p className="text-sm text-amber-700 mt-1">
                You need to add a YouTube API key before analyzing channels. 
                <button 
                  onClick={() => navigate('/api-keys')} 
                  className="ml-1 font-medium underline hover:text-amber-800"
                >
                  Configure API key
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Channel Selection */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Brain className="w-6 h-6 text-purple-600 mr-2" />
              Selecionar o canal a analisar
            </h2>
            <button 
              onClick={fetchUserChannels} 
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh channels"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {isLoadingChannels ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="w-8 h-8 text-purple-600 animate-spin mr-3" />
              <p className="text-gray-600">Carregando seus canais...</p>
            </div>
          ) : userChannels.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600 mb-4">Ainda não analisou nenhum canal.</p>
              <button 
                onClick={() => navigate('/channel-analysis')} 
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Analyze a Channel
              </button>
            </div>
          ) : (
            <div>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={selectedChannel?.channel_id || ''}
                onChange={handleChannelSelect}
              >
                <option value="">Selecionar um canal para analisar</option>
                {userChannels.map((channel) => (
                  <option key={channel.channel_id} value={channel.channel_id}>
                    {channel.title} ({channel.subscriber_count.toLocaleString()} subscribers)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {selectedChannel && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">Análise de IA para "{selectedChannel.title}"</h2>
              </div>
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Information about this tool"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            
            {showInfo && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-800">
                <p className="mb-2">
                  <strong>Como utilizar o Analisador de canais AI:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Adicionar canais da concorrência utilizando o seu URL ou nome de canal</li>
                  <li>Insira sua chave API do OpenAI (obtenha uma em platform.openai.com)</li>
                  <li>Clique em "Gerar Análise de Conteúdo Viral"</li>
                  <li>Receba insights sobre tendências, padrões e ideias de conteúdo viral</li>
                </ol>
              </div>
            )}
            
            <p className="text-gray-600 mb-6">
              Adicione canais da concorrência e use IA para identificar tendências e oportunidades de conteúdo viral
            </p>
            
            {/* Competitor Management */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Manage Competitors</h3>
              
              <form onSubmit={handleAddCompetitor} className="mb-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-grow">
                    <input
                      type="text"
                      placeholder="Competitor channel URL or name"
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
                <h4 className="font-medium text-gray-700 mb-3">Canais da concorrência</h4>
                
                {competitors.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nenhum concorrente adicionado. Adicione canais para iniciar a análise.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {competitors.map((competitor) => (
                      <li key={competitor.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-all">
                        <span className="font-medium text-gray-800">{competitor.title}</span>
                        <button
                          onClick={() => handleDeleteCompetitor(competitor.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Remove competitor"
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
                    placeholder="Enter your OpenAI API key"
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
                  Uma chave API do OpenAI é necessária para gerar análises de IA
                </p>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                A sua chave API é utilizada apenas para esta análise e não é armazenada permanentemente.
                Obter uma chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">platform.openai.com</a>
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
                    Gerando análise de IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {aiAnalysis ? 'Atualizar Análise de Conteúdo Viral' : 'Gerar Análise de Conteúdo Viral'}
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-gray-500 mt-2">
                Esta análise utiliza o GPT-4o para processar dados de vídeos virais e gerar informações estratégicas
              </p>
            </div>
          </div>
          
          {/* Analysis Results */}
          {aiAnalysis && (
            <div className="p-6 bg-gradient-to-r from-purple-50 to-purple-50">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-1 flex items-center">
                  <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                  Análise do potencial viral
                </h3>
                <p className="text-sm text-gray-600">
                  Gerado em {new Date(aiAnalysis.created_at).toLocaleDateString('en-US', { 
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
                  <h4 className="font-medium text-purple-700 mb-3">Identificação de Tendências</h4>
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
                        <span className="inline-flex items-center justify-center bg-purple-100 text-indipurplego-800 w-6 h-6 rounded-full text-xs font-medium mr-2 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
                  <h4 className="font-medium text-purple-700 mb-3">Nichos com Potencial Viral</h4>
                  <ul className="space-y-2">
                    {aiAnalysis.analysis.viralPotential.map((potential, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 w-6 h-6 rounded-full text-xs font-medium mr-2 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{potential}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 md:col-span-2">
                  <h4 className="font-medium text-green-700 mb-3">Ideias de conteudo</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {aiAnalysis.analysis.contentIdeas.map((idea, index) => (
                      <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <div className="flex items-center mb-2">
                          <span className="inline-flex items-center justify-center bg-green-100 text-green-800 w-6 h-6 rounded-full text-xs font-medium mr-2">
                            {index + 1}
                          </span>
                          <h5 className="font-medium text-green-800">Ideia de video</h5>
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
      )}
    </div>
  );
};

export default AiChannelAnalyzer;