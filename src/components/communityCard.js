"use client";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useState } from "react";

const CommunityCard = ({ community }) => {
  const router = useRouter();
  const [isJoined, setIsJoined] = useState(false);

  const handleJoin = () => {
  const query = new URLSearchParams({
    name: community.name,
    avatar: community.avatar,
    category: community.category,
    description: community.description,
    members: community.members,
  }).toString();

  router.push(`/community/${community.id}?${query}`);
};


  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-84 h-84 flex flex-col justify-between hover:shadow-xl transition-shadow mb-2 p-6">
      <div className="flex justify-center items-center">
        <img
          src={community.avatar}
          alt={community.name}
          className="w-30 h-30 rounded-full"
        />
      </div>

      <span className="text-xs bg-blue-100 dark:bg-[#a7d6f2] text-[#145c86] dark:text-blue-300 flex justify-center py-1 rounded-full max-w-20">
        {community.category}
      </span>

      <div className="mt-4 flex-1 flex flex-col justify-center">
        <h3 className="font-bold text-lg text-[#1E8DD0] dark:text-white mb-2 line-clamp-2">
          {community.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
          {community.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span>{community.members.toLocaleString()} members</span>
        </div>
        <button
          onClick={handleJoin}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            isJoined
              ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"
              : "bg-[#1E8DD0] hover:bg-[#145c86] text-white"
          }`}
        >
          {isJoined ? "Joined" : "Join"}
        </button>
      </div>
    </div>
  );
};

export default CommunityCard;
