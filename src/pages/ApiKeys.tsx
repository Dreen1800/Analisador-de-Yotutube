import { useState, useEffect } from 'react';
import { useApiKeyStore } from '../stores/apiKeyStore';
import { Eye, EyeOff, Plus, Trash, Check, X, Key, Info, AlertCircle } from 'lucide-react';

const ApiKeys = () => {
  const { 
    apiKeys, 
    currentKey, 
    isLoading, 
    error, 
    fetchApiKeys, 
    addApiKey, 
    updateApiKey, 
    deleteApiKey, 
    setCurrentKey 
  } = useApiKeyStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKeyValue, setShowKeyValue] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);
  
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || !newKeyValue) return;
    
    try {
      await addApiKey(newKeyName, newKeyValue);
      setNewKeyName('');
      setNewKeyValue('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Erro ao adicionar chave API:', error);
    }
  };
  
  const toggleShowKey = (keyId: string) => {
    setShowKeyValue(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };
  
  const handleSetActive = async (keyId: string) => {
    // Primeiro, define todas as chaves como inativas
    for (const key of apiKeys) {
      if (key.is_active && key.id !== keyId) {
        await updateApiKey(key.id, { is_active: false });
      }
    }
    
    // Depois define a selecionada como ativa
    const key = apiKeys.find(k => k.id === keyId);
    if (key) {
      await updateApiKey(keyId, { is_active: true });
      setCurrentKey(key);
    }
  };
  
  const handleDeleteKey = async (keyId: string) => {
    if (deleteConfirm === keyId) {
      await deleteApiKey(keyId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(keyId);
      
      // Limpa confirmação automaticamente após 3 segundos
      setTimeout(() => {
        setDeleteConfirm(null);
      }, 3000);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Chaves de API do YouTube</h1>
        <p className="text-gray-600">Gerencie suas chaves para a API do YouTube Data</p>
      </div>
      
      <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-8 border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-800">Suas Chaves de API</h2>
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Informações sobre chaves API"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={() => setShowAddForm(!showAddForm)} 
              className="mt-3 md:mt-0 inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-md"
            >
              {showAddForm ? (
                <>
                  <X className="w-5 h-5 mr-2" />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Nova Chave
                </>
              )}
            </button>
          </div>
          
          {showHelp && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100 flex items-start">
              <AlertCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-1">O que são chaves de API do YouTube?</p>
                <p>Uma chave da API YouTube Data é necessária para analisar canais. Cada chave tem um limite de cota do Google (geralmente 10.000 unidades por dia).</p>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="ml-auto text-purple-600 hover:text-purple-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {showAddForm && (
            <form onSubmit={handleAddKey} className="mt-4 space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
              <div>
                <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Chave
                </label>
                <input
                  type="text"
                  id="keyName"
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="ex: Minha Chave YouTube API"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="keyValue" className="block text-sm font-medium text-gray-700 mb-1">
                  Chave da API
                </label>
                <div className="relative">
                  <input
                    type={showKeyValue['new'] ? 'text' : 'password'} 
                    id="keyValue"
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-3 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="Sua chave da API YouTube Data"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => toggleShowKey('new')}
                  >
                    {showKeyValue['new'] ? (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  A chave deve ser uma chave válida da API YouTube Data do Google Cloud Console
                </p>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Chave
                </button>
              </div>
            </form>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-t-purple-600 border-purple-200 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600 text-sm">Carregando chaves...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-red-600 mb-2 font-medium">Erro ao carregar as chaves</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <Key className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma chave API</h3>
            <p className="mt-1 text-gray-500 max-w-md mx-auto">
              Você precisa de uma chave de API do YouTube para analisar canais.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-5 inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Primeira Chave
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chave API
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uso
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {key.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="font-mono">
                          {showKeyValue[key.id] 
                            ? key.key 
                            : `${key.key.substring(0, 5)}...${key.key.substring(key.key.length - 5)}`}
                        </span>
                        <button
                          type="button"
                          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => toggleShowKey(key.id)}
                          title={showKeyValue[key.id] ? "Ocultar chave" : "Mostrar chave"}
                        >
                          {showKeyValue[key.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Usada {key.usage_count} {key.usage_count === 1 ? 'vez' : 'vezes'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {key.is_active ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Ativa
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inativa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        {!key.is_active && (
                          <button
                            onClick={() => handleSetActive(key.id)}
                            className="text-purple-600 hover:text-purple-800 transition-colors inline-flex items-center"
                            title="Definir como chave ativa"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            <span>Ativar</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className={`${
                            deleteConfirm === key.id 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-gray-600 hover:text-gray-800'
                          } transition-colors inline-flex items-center`}
                          title="Excluir esta chave"
                        >
                          <Trash className="w-4 h-4 mr-1" />
                          <span>{deleteConfirm === key.id ? 'Confirmar' : 'Excluir'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
          <Info className="w-5 h-5 mr-2 text-purple-600" />
          Sobre Chaves de API do YouTube
        </h3>
        <div className="text-sm text-gray-600 space-y-3">
          <p>
            Uma chave da API YouTube Data é necessária para analisar canais. Cada chave tem um limite de cota do Google 
            (geralmente 10.000 unidades por dia).
          </p>
          <p>
            Para criar uma chave API:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium">Console do Google Cloud</a></li>
            <li>Crie um novo projeto</li>
            <li>Ative a API YouTube Data v3</li>
            <li>Crie credenciais para obter sua chave API</li>
            <li>Copie e cole sua chave aqui</li>
          </ol>
          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-start">
            <AlertCircle className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-800">
              As chaves de API têm limites diários. Se você exceder o limite, precisará esperar até o próximo ciclo de 24 horas ou usar outra chave.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeys;