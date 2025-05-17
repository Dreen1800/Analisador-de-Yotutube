import { useState, useEffect } from 'react';
import { useApiKeyStore } from '../stores/apiKeyStore';
import { useOpenAIKeyStore } from '../stores/openaiKeyStore';
import { useApifyKeyStore } from '../stores/apifyKeyStore';
import { Eye, EyeOff, Plus, Trash, Check, X, Key, Info, AlertCircle, Youtube, Brain, Instagram } from 'lucide-react';
import ApifyKeysTab from './ApifyKeysTab';

interface ApiKeysModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type KeyType = 'youtube' | 'openai' | 'apify';

const ApiKeysModal = ({ isOpen, onClose }: ApiKeysModalProps) => {
    const {
        apiKeys,
        currentKey,
        isLoading: isYoutubeLoading,
        error: youtubeError,
        fetchApiKeys,
        addApiKey,
        updateApiKey,
        deleteApiKey,
        setCurrentKey
    } = useApiKeyStore();

    const {
        openaiKeys,
        currentKey: currentOpenAIKey,
        isLoading: isOpenAILoading,
        error: openaiError,
        fetchOpenAIKeys,
        addOpenAIKey,
        updateOpenAIKey,
        deleteOpenAIKey,
        setCurrentKey: setCurrentOpenAIKey
    } = useOpenAIKeyStore();

    const {
        apifyKeys,
        currentKey: currentApifyKey,
        isLoading: isApifyLoading,
        error: apifyError,
        fetchApifyKeys,
        addApifyKey,
        updateApifyKey,
        deleteApifyKey,
        setCurrentKey: setCurrentApifyKey
    } = useApifyKeyStore();

    const [activeTab, setActiveTab] = useState<KeyType>('youtube');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [showKeyValue, setShowKeyValue] = useState<Record<string, boolean>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchApiKeys();
            fetchOpenAIKeys();
            fetchApifyKeys();
        }
    }, [isOpen, fetchApiKeys, fetchOpenAIKeys, fetchApifyKeys]);

    // Reset form ao mudar de aba
    useEffect(() => {
        setShowAddForm(false);
        setNewKeyName('');
        setNewKeyValue('');
        setShowHelp(false);
    }, [activeTab]);

    const handleAddKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName || !newKeyValue) return;

        try {
            if (activeTab === 'youtube') {
                await addApiKey(newKeyName, newKeyValue);
            } else {
                await addOpenAIKey(newKeyName, newKeyValue);
            }
            setNewKeyName('');
            setNewKeyValue('');
            setShowAddForm(false);
        } catch (error) {
            console.error(`Erro ao adicionar chave ${activeTab}:`, error);
        }
    };

    const toggleShowKey = (keyId: string) => {
        setShowKeyValue(prev => ({
            ...prev,
            [keyId]: !prev[keyId]
        }));
    };

    const handleSetActive = async (keyId: string) => {
        if (activeTab === 'youtube') {
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
        } else {
            // Primeiro, define todas as chaves como inativas
            for (const key of openaiKeys) {
                if (key.is_active && key.id !== keyId) {
                    await updateOpenAIKey(key.id, { is_active: false });
                }
            }

            // Depois define a selecionada como ativa
            const key = openaiKeys.find(k => k.id === keyId);
            if (key) {
                await updateOpenAIKey(keyId, { is_active: true });
                setCurrentOpenAIKey(key);
            }
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        if (deleteConfirm === keyId) {
            if (activeTab === 'youtube') {
                await deleteApiKey(keyId);
            } else {
                await deleteOpenAIKey(keyId);
            }
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(keyId);

            // Limpa confirmação automaticamente após 3 segundos
            setTimeout(() => {
                setDeleteConfirm(null);
            }, 3000);
        }
    };

    const isLoading = activeTab === 'youtube' ? isYoutubeLoading : isOpenAILoading;
    const error = activeTab === 'youtube' ? youtubeError : openaiError;
    const keys = activeTab === 'youtube' ? apiKeys : openaiKeys;

    if (!isOpen) return null;

    const getApiTitle = () => {
        if (activeTab === 'youtube') return 'Chaves de API do YouTube';
        if (activeTab === 'openai') return 'Chaves da OpenAI';
        return 'Chaves da Apify';
    };

    const getApiSubtitle = () => {
        if (activeTab === 'youtube')
            return 'Gerencie suas chaves para a API do YouTube Data';
        if (activeTab === 'openai')
            return 'Gerencie suas chaves para a API da OpenAI (para funcionalidades de IA)';
        return 'Gerencie suas chaves para a API da Apify (para scraping do Instagram)';
    };

    const getHelpText = () => {
        if (activeTab === 'youtube')
            return 'Uma chave da API YouTube Data é necessária para analisar canais. Cada chave tem um limite de cota do Google (geralmente 10.000 unidades por dia).';
        if (activeTab === 'openai')
            return 'Uma chave da API OpenAI é necessária para usar funcionalidades de IA como análise de concorrentes. Você pode criar sua chave no site da OpenAI.';
        return 'Uma chave da API Apify é necessária para acessar o serviço de scraping do Instagram. Você pode criar sua chave no site da Apify.';
    };

    const getKeySuffix = () => {
        if (activeTab === 'youtube') return 'API YouTube';
        if (activeTab === 'openai') return 'API OpenAI';
        return 'API Apify';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
            <div className="relative bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{getApiTitle()}</h1>
                    <p className="text-gray-600 mb-6">{getApiSubtitle()}</p>

                    {/* Abas */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setActiveTab('youtube')}
                            className={`flex items-center px-4 py-2 font-medium text-sm focus:outline-none transition-colors ${activeTab === 'youtube'
                                ? 'border-b-2 border-purple-500 text-purple-700'
                                : 'text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                }`}
                        >
                            <Youtube className="w-4 h-4 mr-2" />
                            Chaves do YouTube
                        </button>
                        <button
                            onClick={() => setActiveTab('openai')}
                            className={`flex items-center px-4 py-2 font-medium text-sm focus:outline-none transition-colors ${activeTab === 'openai'
                                ? 'border-b-2 border-purple-500 text-purple-700'
                                : 'text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                }`}
                        >
                            <Brain className="w-4 h-4 mr-2" />
                            Chaves da OpenAI
                        </button>
                        <button
                            onClick={() => setActiveTab('apify')}
                            className={`flex items-center px-4 py-2 font-medium text-sm focus:outline-none transition-colors ${activeTab === 'apify'
                                ? 'border-b-2 border-purple-500 text-purple-700'
                                : 'text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                }`}
                        >
                            <Instagram className="w-4 h-4 mr-2" />
                            Chaves da Apify
                        </button>
                    </div>

                    {activeTab === 'apify' ? (
                        <ApifyKeysTab />
                    ) : (
                        <div className="bg-white shadow-md rounded-xl overflow-hidden mb-6 border border-gray-100">
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                    <div className="flex items-center">
                                        <h2 className="text-lg font-semibold text-gray-800">
                                            {activeTab === 'youtube' ? 'Suas Chaves de API' : 'Suas Chaves da OpenAI'}
                                        </h2>
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
                                            <p className="font-medium mb-1">
                                                {activeTab === 'youtube' ? 'O que são chaves de API do YouTube?' : 'O que são chaves da OpenAI?'}
                                            </p>
                                            <p>{getHelpText()}</p>
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
                                                placeholder={`ex: Minha Chave ${getKeySuffix()}`}
                                                value={newKeyName}
                                                onChange={(e) => setNewKeyName(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="keyValue" className="block text-sm font-medium text-gray-700 mb-1">
                                                {activeTab === 'youtube' ? 'Chave da API' : 'Chave da OpenAI'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showKeyValue['new'] ? 'text' : 'password'}
                                                    id="keyValue"
                                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-3 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                    placeholder={activeTab === 'youtube'
                                                        ? "Sua chave da API YouTube Data"
                                                        : "Sua chave da API OpenAI (começando com sk-)"
                                                    }
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
                                                {activeTab === 'youtube'
                                                    ? "A chave deve ser uma chave válida da API YouTube Data do Google Cloud Console"
                                                    : "A chave deve ser uma chave válida da API da OpenAI (formato sk-...)"
                                                }
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
                            ) : keys.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                                        {activeTab === 'youtube' ? (
                                            <Key className="h-8 w-8 text-gray-600" />
                                        ) : (
                                            <Brain className="h-8 w-8 text-gray-600" />
                                        )}
                                    </div>
                                    <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma chave {activeTab === 'youtube' ? 'API' : 'OpenAI'}</h3>
                                    <p className="mt-1 text-gray-500 max-w-md mx-auto">
                                        {activeTab === 'youtube'
                                            ? 'Você precisa de uma chave de API do YouTube para analisar canais.'
                                            : 'Você precisa de uma chave da OpenAI para usar as funcionalidades de IA.'
                                        }
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
                                                    {activeTab === 'youtube' ? 'Chave API' : 'Chave OpenAI'}
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
                                            {keys.map((key) => (
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
                                                                className={`${deleteConfirm === key.id
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
                    )}

                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                            <Info className="w-5 h-5 mr-2 text-purple-600" />
                            {activeTab === 'youtube' ? 'Sobre Chaves de API do YouTube' :
                                activeTab === 'openai' ? 'Sobre Chaves da OpenAI' :
                                    'Sobre Chaves da Apify'}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-3">
                            <p>
                                {activeTab === 'youtube'
                                    ? 'Uma chave da API YouTube Data é necessária para analisar canais. Cada chave tem um limite de cota do Google (geralmente 10.000 unidades por dia).'
                                    : activeTab === 'openai'
                                        ? 'Uma chave da API OpenAI é necessária para usar funcionalidades de IA como análise de concorrentes. A API da OpenAI é paga e baseada no uso, então você precisará criar uma conta e adicionar um método de pagamento.'
                                        : 'Uma chave da API Apify é necessária para acessar o serviço de scraping do Instagram. Você pode criar sua chave no site da Apify após criar uma conta.'}
                            </p>
                            <p>
                                {activeTab === 'youtube' ? 'Para criar uma chave API do YouTube:' :
                                    activeTab === 'openai' ? 'Para criar uma chave API da OpenAI:' :
                                        'Para criar uma chave API da Apify:'}
                            </p>
                            {activeTab === 'youtube' ? (
                                <ol className="list-decimal list-inside space-y-2 ml-2">
                                    <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium">Console do Google Cloud</a></li>
                                    <li>Crie um novo projeto</li>
                                    <li>Ative a API YouTube Data v3</li>
                                    <li>Crie credenciais para obter sua chave API</li>
                                    <li>Copie e cole sua chave aqui</li>
                                </ol>
                            ) : activeTab === 'openai' ? (
                                <ol className="list-decimal list-inside space-y-2 ml-2">
                                    <li>Acesse o <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium">Painel da OpenAI</a></li>
                                    <li>Crie uma conta caso ainda não tenha</li>
                                    <li>Adicione um método de pagamento na seção Billing</li>
                                    <li>Vá até "API Keys" e clique em "Create new secret key"</li>
                                    <li>Dê um nome à sua chave e copie-a (ela começa com "sk-")</li>
                                    <li>Cole a chave aqui</li>
                                </ol>
                            ) : (
                                <ol className="list-decimal list-inside space-y-2 ml-2">
                                    <li>Acesse o <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium">Console da Apify</a></li>
                                    <li>Crie uma conta caso ainda não tenha</li>
                                    <li>Vá até "Integrations" {`>`} "API" e copie seu "Personal API Token"</li>
                                    <li>Ou clique em "Create new" para gerar um novo token</li>
                                    <li>Cole o token aqui (ele começa com "apify_api_")</li>
                                </ol>
                            )}
                            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-start">
                                <AlertCircle className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-purple-800">
                                    {activeTab === 'youtube'
                                        ? 'As chaves de API têm limites diários. Se você exceder o limite, precisará esperar até o próximo ciclo de 24 horas ou usar outra chave.'
                                        : activeTab === 'openai'
                                            ? 'As chaves da OpenAI são cobradas por uso. Você será cobrado pelos tokens utilizados nas solicitações feitas com sua chave.'
                                            : 'As chaves da Apify têm diferentes limites dependendo do seu plano. Existe um plano gratuito com limites mensais para experimentar o serviço.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeysModal; 