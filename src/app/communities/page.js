"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Play,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import NoSSR from "../../components/NoSSR";
import Navbar from "../../components/navbar";
import { useRouter } from "next/navigation";
import CommunityCard from "../../components/communityCard";
import { darkMode } from "../../components/navbar";

const CommunitiesPage = () => {
  

  const [isMounted, setIsMounted] = useState(false); // to prevent SSR mismatch
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Sample YouTube videos
  const videos = [
    {
      id: 1,
      url: "https://www.youtube.com/embed/t96A1DrsZTw", // embed link (not watch?v=)
      title: "Understanding Legal Contracts",
    },
    {
      id: 2,
      url: "https://www.youtube.com/embed/fp051F5vb9I",
      title: "Government Schemes Explained",
    },
    {
      id: 3,
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      title: "Property Law Basics",
    },
    {
      id: 4,
      url: "https://www.youtube.com/embed/_WYqsW1lYbU",
      title: "Intellectual Property Rights",
    },
    {
      id: 5,
      url: "https://www.youtube.com/embed/Kd0SKouTtQY",
      title: "Consumer Protection Laws",
    },

  ];

const communities = [
  {
    id: 1,
    name: "Contract Law Experts",
    avatar: "/icons/contract_law.png",
    category: "Contract",
    description: "Discuss contract clauses, review agreements, and get legal opinions.",
    members: 1520,
    isJoined: false,
    thumbnail: "https://source.unsplash.com/400x300/?law,contract",
  },
  {
    id: 2,
    name: "Property Law & Real Estate",
    avatar: "/icons/property_law.png",
    category: "Property",
    description: "Share insights on property disputes, ownership laws, and tenancy agreements.",
    members: 980,
    isJoined: true,
    thumbnail: "https://source.unsplash.com/400x300/?property,law",
  },
  {
    id: 3,
    name: "Consumer Rights Forum",
    avatar: "/icons/consumer-rights.png",
    category: "Consumer",
    description: "Discuss complaints, product/service issues, and consumer protection laws.",
    members: 1340,
    isJoined: false,
    thumbnail: "https://source.unsplash.com/400x300/?consumer,law",
  },
  {
    id: 4,
    name: "Family & Divorce Law",
    avatar: "/icons/family_law.png",
    category: "Family",
    description: "Get advice on divorce, custody, maintenance, and other family matters.",
    members: 765,
    isJoined: false,
    thumbnail: "https://source.unsplash.com/400x300/?family,law",
  },
  {
    id: 5,
    name: "Startup & Business Law",
    avatar: "/icons/business_law.png",
    category: "Business",
    description: "Legal guidance for startups: incorporation, compliance, contracts, and funding.",
    members: 1120,
    isJoined: true,
    thumbnail: "https://source.unsplash.com/400x300/?startup,law",
  },
  {
    id: 6,
    name: "Tax & Finance Law",
    avatar: "icons/tax.png",
    category: "Finance",
    description: "Share insights on tax planning, filing, GST, and financial regulations.",
    members: 890,
    isJoined: false,
    thumbnail: "https://source.unsplash.com/400x300/?tax,law",
  },
  {
    id: 7,
    name: "Immigration & Visa Law",
    avatar: "/icons/visa_law.png",
    category: "Immigration",
    description: "Discuss visa applications, citizenship, and immigration rules.",
    members: 620,
    isJoined: false,
    thumbnail: "https://source.unsplash.com/400x300/?immigration,law",
  },
  {
    id: 8,
    name: "Cyber & IT Law",
    avatar: "/icons/cyber_law.png",
    category: "Cyber",
    description: "Talk about cybercrime, data protection, IT compliance, and online disputes.",
    members: 480,
    isJoined: false,
    thumbnail: "https://source.unsplash.com/400x300/?cyber,law",
  }
];


  const VideoCard = ({ video }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden min-w-[320px]">
      <div className="relative">
        <iframe
          width="100%"
          height="200"
          src={video.url}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
        ></iframe>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {video.title}
        </h3>
      </div>
    </div>
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Server render ke waqt kuch bhi return mat karo
    return null;
  }



  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <NoSSR />
      <Navbar />

      <div className="fixed bottom-0 left-0 w-400 h-400 z-[0] ">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#daeef9" d="M49.3,0.7C49.3,21.2,24.7,42.3,-2.2,42.3C-29,42.3,-58,21.2,-58,0.7C-58,-19.8,-29,-39.7,-2.2,-39.7C24.7,-39.7,49.3,-19.8,49.3,0.7Z" transform="translate(100 100)" />
            </svg>
          </div>
      
      <div className="fixed bottom-0 left-0 w-200 h-200 z-[0] ">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#f1f3f4" d="M49.3,0.7C49.3,21.2,24.7,42.3,-2.2,42.3C-29,42.3,-58,21.2,-58,0.7C-58,-19.8,-29,-39.7,-2.2,-39.7C24.7,-39.7,49.3,-19.8,49.3,0.7Z" transform="translate(100 100)" />
            </svg>
          </div>

      <div className="fixed top-10 left-20 w-400 h-400 z-[0] ">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#f1f3f4" d="M49.3,0.7C49.3,21.2,24.7,42.3,-2.2,42.3C-29,42.3,-58,21.2,-58,0.7C-58,-19.8,-29,-39.7,-2.2,-39.7C24.7,-39.7,49.3,-19.8,49.3,0.7Z" transform="translate(100 100)" />
            </svg>
          </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search communities, topics, or legal advice..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1E8DD0]"
            />
          </div>
        </div>

        {/* Featured Videos */}
        <div className="mb-12 z-50 relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Featured Legal Content
            </h2>
            <div className="flex space-x-2">
              <button className="p-2 rounded-full bg-white dark:bg-gray-800 shadow">
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="p-2 rounded-full bg-white dark:bg-gray-800 shadow">
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide ">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>



        {/* Communities Section */}
        <div className="">
          
          
          <div className="flex items-center justify-between mb-8 z-50 relative">
            <div>
              <h2 className="text-3xl font-extrabold text-[] font-sans  dark:text-white mb-2">Join Communities</h2>
              <p className="text-gray-600 dark:text-gray-400">Connect with others, get advice, and share knowledge</p>
            </div>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-[#1E8DD0] dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Filter
              </button>
              <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-[#1E8DD0] dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Sort by
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-3 gap-6 z-50 relative">
            {communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>

          {/* Load More Button */}
          <div className="text-center mt-8">
            <button className="bg-[#1E8DD0] hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors z-50 relative">
              Load More Communities
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default CommunitiesPage;