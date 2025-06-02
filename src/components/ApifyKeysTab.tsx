import { useState, useEffect } from 'react';
import { useApifyKeyStore } from '../stores/apifyKeyStore';
import { PlusCircle, Trash2, Check, AlertCircle, Info } from 'lucide-react';

export default function ApifyKeysTab() {
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [formError, setFormError] = useState('');

    const {
        apifyKeys,
        currentKey,
        isLoading,
        error,
        fetchApifyKeys,
        addApifyKey,
        updateApifyKey,
        deleteApifyKey
    } = useApifyKeyStore();

    useEffect(() => {
        fetchApifyKeys();
    }, [fetchApifyKeys]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newKeyName.trim() || !newKeyValue.trim()) {
            setFormError('Please enter both a name and API key');
            return;
        }

        try {
            await addApifyKey(newKeyName, newKeyValue);
            setNewKeyName('');
            setNewKeyValue('');
            setShowAddForm(false);
            setFormError('');
        } catch (err) {
            console.error('Error adding API key:', err);
        }
    };

    const handleSetActive = async (id: string) => {
        try {
            await updateApifyKey(id, { is_active: true });
        } catch (err) {
            console.error('Error setting active key:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this API key?')) {
            try {
                await deleteApifyKey(id);
            } catch (err) {
                console.error('Error deleting API key:', err);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Apify API Keys</h3>

                <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Add Key
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                {isLoading && (
                    <div className="flex justify-center items-center py-4">
                        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading API keys</h3>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showAddForm && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="key-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Key Name
                                </label>
                                <input
                                    type="text"
                                    id="key-name"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                    placeholder="e.g., My Apify Key"
                                />
                            </div>

                            <div>
                                <label htmlFor="key-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    API Key
                                </label>
                                <input
                                    type="text"
                                    id="key-value"
                                    value={newKeyValue}
                                    onChange={(e) => setNewKeyValue(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                    placeholder="apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                />
                            </div>

                            {formError && (
                                <div className="text-sm text-red-600 dark:text-red-400">{formError}</div>
                            )}

                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewKeyName('');
                                        setNewKeyValue('');
                                        setFormError('');
                                    }}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Adding...' : 'Add Key'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {apifyKeys.length === 0 && !isLoading ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        <Info className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                        <p>No Apify API keys added yet. Add a key to start using Instagram Analytics.</p>
                        <p className="text-sm mt-2">
                            You can get your Apify API token from <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-500 dark:hover:text-purple-400">Apify Console</a>
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {apifyKeys.map((key) => (
                            <li key={key.id} className="px-4 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{key.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {key.api_key.slice(0, 10)}...{key.api_key.slice(-4)}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {key.is_active ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                                <Check className="mr-1 h-3 w-3" />
                                                Active
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSetActive(key.id)}
                                                className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-500 dark:hover:text-purple-400 font-medium"
                                            >
                                                Set as active
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(key.id)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">About Apify API Keys</h4>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Apify API keys are used to access the Instagram scraping capabilities. The key is stored securely and only used for your account.
                </p>
                <div className="mt-2 text-sm">
                    <a href="https://apify.com/apify/instagram-scraper" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-500 dark:text-purple-500 dark:hover:text-purple-400 font-medium">
                        Learn more about Apify Instagram Scraper
                    </a>
                </div>
            </div>
        </div>
    );
} 