import React from 'react';
import { Instagram, Users, Image } from 'lucide-react';

interface InstagramProfileCardProps {
    profile: {
        id: string;
        username: string;
        profilePicUrl: string;
        followersCount: number;
        followsCount: number;
        postsCount: number;
        fullName?: string;
    };
    isActive: boolean;
    onClick: () => void;
}

const InstagramProfileCard: React.FC<InstagramProfileCardProps> = ({
    profile,
    isActive,
    onClick
}) => {
    return (
        <div
            className={`flex flex-col items-center p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${isActive ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
                }`}
            onClick={onClick}
        >
            <div className="mb-3">
                {profile.profilePicUrl ? (
                    <img
                        src={profile.profilePicUrl}
                        alt={profile.username}
                        className="w-16 h-16 rounded-full border-2 border-purple-100 object-cover"
                    />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                        <Instagram className="w-8 h-8 text-purple-500" />
                    </div>
                )}
            </div>

            <h3 className="font-medium text-gray-900">@{profile.username}</h3>
            {profile.fullName && (
                <p className="text-xs text-gray-500 text-center mt-1">{profile.fullName}</p>
            )}

            <div className="w-full mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                <div className="flex flex-col items-center">
                    <span className="font-semibold text-gray-900">{profile.followersCount.toLocaleString()}</span>
                    <span className="text-gray-500">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-semibold text-gray-900">{profile.followsCount.toLocaleString()}</span>
                    <span className="text-gray-500">Following</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-semibold text-gray-900">{profile.postsCount.toLocaleString()}</span>
                    <span className="text-gray-500">Posts</span>
                </div>
            </div>

            <button
                className={`mt-3 w-full py-1 px-3 text-xs font-medium rounded ${isActive
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
            >
                {isActive ? 'Currently Viewing' : 'View Profile'}
            </button>
        </div>
    );
};

export default InstagramProfileCard; 