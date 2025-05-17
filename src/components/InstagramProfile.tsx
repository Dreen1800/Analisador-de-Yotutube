import React, { useState } from 'react';
import { Instagram, Users, Award, Image, Calendar } from 'lucide-react';
import { getProxiedImageUrl } from '../services/instagramService';

interface InstagramProfileProps {
    profile: {
        id: string;
        instagram_id: string;
        username: string;
        full_name: string;
        biography: string;
        followers_count: number;
        follows_count: number;
        posts_count: number;
        profile_pic_url: string;
        is_business_account: boolean;
        business_category_name?: string;
        created_at: string;
    };
}

const InstagramProfile: React.FC<InstagramProfileProps> = ({ profile }) => {
    const [imgError, setImgError] = useState(false);

    // Function to handle image loading errors
    const handleImageError = () => {
        console.error(`Failed to load profile image from URL: ${profile.profile_pic_url}`);
        setImgError(true);
    };

    // Usar a função proxificadora para obter a URL que passa pelo proxy
    const proxiedProfileImageUrl = getProxiedImageUrl(profile.profile_pic_url);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-purple-500 to-pink-500">
                <div className="absolute -bottom-12 left-4">
                    {!imgError && profile.profile_pic_url ? (
                        <img
                            src={proxiedProfileImageUrl}
                            alt={profile.username}
                            className="w-24 h-24 rounded-full border-4 border-white object-cover"
                            onError={handleImageError}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            loading="eager"
                            fetchpriority="high"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center">
                            <Instagram className="h-12 w-12 text-gray-400" />
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-16 pb-5 px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
                        <div className="flex items-center text-gray-600">
                            <Instagram className="h-4 w-4 mr-1" />
                            <span>@{profile.username}</span>
                        </div>

                        {profile.is_business_account && profile.business_category_name && (
                            <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Award className="mr-1 h-3 w-3" />
                                {profile.business_category_name}
                            </div>
                        )}
                    </div>

                    <div className="flex mt-4 md:mt-0 space-x-4 text-center">
                        <div>
                            <div className="text-xl font-bold text-gray-900">{profile.followers_count.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">Followers</div>
                        </div>
                        <div>
                            <div className="text-xl font-bold text-gray-900">{profile.follows_count.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">Following</div>
                        </div>
                        <div>
                            <div className="text-xl font-bold text-gray-900">{profile.posts_count.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">Posts</div>
                        </div>
                    </div>
                </div>

                {profile.biography && (
                    <div className="mt-4">
                        <p className="text-gray-700 whitespace-pre-line">{profile.biography}</p>
                    </div>
                )}

                <div className="mt-4 flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Analyzed on {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
};

export default InstagramProfile; 