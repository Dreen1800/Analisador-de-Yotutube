import React, { useState } from 'react';
import { Heart, MessageCircle, Eye, Video, Calendar, ExternalLink, Image } from 'lucide-react';
import { getProxiedImageUrl } from '../services/instagramService';

interface Post {
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

interface InstagramPostsProps {
    posts: Post[];
}

const InstagramPosts: React.FC<InstagramPostsProps> = ({ posts }) => {
    const [activeTab, setActiveTab] = useState<'grid' | 'list'>('grid');
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

    if (posts.length === 0) {
        return (
            <div className="text-center py-10">
                <Image className="h-16 w-16 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
                <p className="mt-1 text-sm text-gray-500">No posts have been retrieved for this profile.</p>
            </div>
        );
    }

    const handlePostClick = (post: Post) => {
        setSelectedPost(post);
    };

    const closeModal = () => {
        setSelectedPost(null);
    };

    const handleImgError = (id: string) => {
        console.error(`Failed to load post image for ${id}`);
        setImgErrors(prev => ({
            ...prev,
            [id]: true
        }));
    };

    // Função para obter a URL proxificada de uma imagem de post
    const getPostImage = (url: string) => {
        return getProxiedImageUrl(url);
    };

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                    {posts.length} Posts
                </h2>
                <div className="flex p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setActiveTab('grid')}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${activeTab === 'grid'
                            ? 'bg-white shadow-sm text-gray-900'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Grid
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${activeTab === 'list'
                            ? 'bg-white shadow-sm text-gray-900'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        List
                    </button>
                </div>
            </div>

            {activeTab === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            className="relative aspect-square overflow-hidden rounded-md cursor-pointer bg-gray-100"
                            onClick={() => handlePostClick(post)}
                        >
                            {!imgErrors[post.id] ? (
                                <img
                                    src={getPostImage(post.display_url)}
                                    alt={post.caption?.substring(0, 20) || 'Instagram post'}
                                    className="w-full h-full object-cover"
                                    onError={() => handleImgError(post.id)}
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                    <Image className="h-8 w-8 text-gray-400" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center">
                                <div className="text-white opacity-0 hover:opacity-100 flex space-x-3">
                                    <div className="flex items-center">
                                        <Heart className="h-4 w-4 mr-1" />
                                        <span>{post.likes_count}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <MessageCircle className="h-4 w-4 mr-1" />
                                        <span>{post.comments_count}</span>
                                    </div>
                                </div>
                            </div>
                            {post.is_video && (
                                <div className="absolute top-2 right-2">
                                    <Video className="h-5 w-5 text-white drop-shadow-lg" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            className="bg-white rounded-lg border p-4 flex flex-col sm:flex-row cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handlePostClick(post)}
                        >
                            <div className="sm:w-48 h-48 sm:h-full flex-shrink-0 mb-4 sm:mb-0 sm:mr-4">
                                <div className="w-full h-full relative rounded-md overflow-hidden bg-gray-100">
                                    {!imgErrors[post.id] ? (
                                        <img
                                            src={getPostImage(post.display_url)}
                                            alt={post.caption?.substring(0, 20) || 'Instagram post'}
                                            className="w-full h-full object-cover"
                                            onError={() => handleImgError(post.id)}
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                            <Image className="h-12 w-12 text-gray-400" />
                                        </div>
                                    )}
                                    {post.is_video && (
                                        <div className="absolute top-2 right-2">
                                            <Video className="h-5 w-5 text-white drop-shadow-lg" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <div className="mb-2 line-clamp-3 text-gray-800">
                                    {post.caption || 'No caption'}
                                </div>
                                <div className="mt-auto flex flex-wrap gap-2">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Heart className="h-4 w-4 mr-1 text-pink-500" />
                                        <span>{post.likes_count.toLocaleString()} likes</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <MessageCircle className="h-4 w-4 mr-1 text-blue-500" />
                                        <span>{post.comments_count.toLocaleString()} comments</span>
                                    </div>
                                    {post.video_view_count && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Eye className="h-4 w-4 mr-1 text-green-500" />
                                            <span>{post.video_view_count.toLocaleString()} views</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedPost && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeModal}>
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col md:flex-row h-full">
                            <div className="md:w-1/2 bg-black flex items-center justify-center">
                                {!imgErrors[`modal-${selectedPost.id}`] ? (
                                    <img
                                        src={getPostImage(selectedPost.display_url)}
                                        alt={selectedPost.caption?.substring(0, 20) || 'Instagram post'}
                                        className="max-w-full max-h-[500px] object-contain"
                                        onError={() => handleImgError(`modal-${selectedPost.id}`)}
                                        referrerPolicy="no-referrer"
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <div className="w-full h-[300px] flex items-center justify-center bg-gray-800">
                                        <Image className="h-16 w-16 text-gray-500" />
                                    </div>
                                )}
                            </div>
                            <div className="md:w-1/2 p-4 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedPost.is_video ? 'Video' : 'Photo'} Post
                                    </h3>
                                    <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                                        &times;
                                    </button>
                                </div>

                                <div className="flex-grow overflow-y-auto">
                                    {selectedPost.caption && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Caption</h4>
                                            <p className="text-gray-800 whitespace-pre-line">{selectedPost.caption}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-700 mb-1">Likes</div>
                                            <div className="text-lg font-bold text-pink-600">{selectedPost.likes_count.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-700 mb-1">Comments</div>
                                            <div className="text-lg font-bold text-blue-600">{selectedPost.comments_count.toLocaleString()}</div>
                                        </div>
                                        {selectedPost.video_view_count && (
                                            <div>
                                                <div className="text-sm font-medium text-gray-700 mb-1">Views</div>
                                                <div className="text-lg font-bold text-green-600">{selectedPost.video_view_count.toLocaleString()}</div>
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-sm font-medium text-gray-700 mb-1">Posted on</div>
                                            <div className="text-gray-800">{new Date(selectedPost.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <a
                                        href={selectedPost.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View on Instagram
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstagramPosts; 