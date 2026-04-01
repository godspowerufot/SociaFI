"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserIcon,
  HashtagIcon,
  PresentationChartLineIcon,
  WalletIcon,

  HandThumbUpIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  PlusIcon
} from "@heroicons/react/24/solid";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSocial } from "@/lib/contexts/SocialContext";
import { useMarketplace } from "@/lib/contexts/MarketplaceContext";
import Marketplace from "@/components/Marketplace";
import Vault from "@/components/Vault";
import PostCard from "@/components/PostCard";
import TokenizeHub from "@/components/TokenHub";
import RoleExplainerModal from "@/components/RoleExplainerModal";
import TokenizeModal from "@/components/TokenizeModal";
import ProfileModal from "@/components/ProfileModal";
import { Post } from "@/lib/mock/types";
import { useSocialContract } from "@/lib/hooks/useSocialContract";

export default function Home() {
  const { currentUser } = useAuth();
  const { profiles, posts, createPost } = useSocial();
  const { strkBalance } = useAuth();
  const { createPost: executeContractPost, getAllPosts, isTxPending } = useSocialContract();

  const [activeTab, setActiveTab] = useState<string>("feed");
  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  // Managed Modals State
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState<string | null>(null);

  const userProfile = currentUser ? profiles[currentUser] : null;
  const userBalance = currentUser ? strkBalance[currentUser] : "0";

  const fetchPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const contractPosts = await getAllPosts();
      setAllPosts(contractPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [getAllPosts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async () => {
    if (!postTitle || !postContent) return;

    try {
      // Use the centralized context method which handles both contract sync and refresh
      await createPost(postContent, postTitle);
      
      setPostTitle("");
      setPostContent("");
    } catch (error) {
      console.error("Failed to broadcast post", error);
    }
  };


  const filteredPosts = filterUser
    ? allPosts.filter(p => p.creator === filterUser)
    : allPosts;

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. LEFT SIDEBAR: Navigation / User */}
      <aside className="hidden lg:flex flex-col w-[260px] gap-4 shrink-0">
        {currentUser && userProfile && (
          <div className="brutalist-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white border-3 border-black rounded-none flex items-center justify-center font-black text-black overflow-hidden brutalist-shadow">
                {userProfile.avatarCid.startsWith('http') ? (
                  <img src={userProfile.avatarCid} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  userProfile.username.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight text-black">{userProfile.username}</h3>
                <p className="text-[10px] text-black bg-yellow-400 px-1 font-bold uppercase inline-block border border-black">LVL 24 CREATOR</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-2">
              <div className="bg-white p-2 border-2 border-black">
                <div className="text-xs font-black text-black">{userProfile.followerCount}</div>
                <div className="text-[8px] text-black uppercase font-black">Followers</div>
              </div>
              <div className="bg-yellow-400 p-2 border-2 border-black">
                <div className="text-xs font-black text-black">{userBalance}</div>
                <div className="text-[8px] text-black uppercase font-black">STRK</div>
              </div>
            </div>
            {/* Notification Banner */}
            <div className="flex items-start gap-2 bg-cyan-400 border-2 border-black p-3 brutalist-shadow animate-in slide-in-from-bottom-2 duration-500">
              <SparklesIcon className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <p className="text-[9px] font-black text-black uppercase leading-relaxed tracking-tight">
                Click any post card to convert it to a <span className="bg-black text-white px-1">Content Token</span> on the bonding curve.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[9px] font-black text-black uppercase tracking-widest">Navigation</span>
          <button
            onClick={() => setIsExplainerOpen(true)}
            className="flex items-center gap-1 text-[9px] font-black text-black hover:bg-yellow-400 px-1 border border-black uppercase tracking-widest transition-colors"
          >
            <QuestionMarkCircleIcon className="w-3.5 h-3.5" />
            How it works
          </button>
        </div>
        <nav className="flex flex-col gap-2">
          {[
            { id: "feed", label: "Global Feed", icon: HashtagIcon },
            { id: "market", label: "Trade Center", icon: PresentationChartLineIcon },
            { id: "tokens", label: "Token Hub", icon: SparklesIcon },
            { id: "vault", label: "Vault Storage", icon: WalletIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setFilterUser(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-3 border-black ${activeTab === item.id
                ? "bg-yellow-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                : "bg-white text-black hover:bg-cyan-400"
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <RoleExplainerModal isOpen={isExplainerOpen} onClose={() => setIsExplainerOpen(false)} />
      </aside>

      {/* 2. MIDDLE COLUMN: Feed / Core Activity */}
      <section className="grow space-y-4 min-w-0">

        {/* Post Input (Only visible if logged in) */}
        {activeTab === "feed" && !filterUser && (
          currentUser ? (
            <div className="brutalist-card p-4">
              <input
                type="text"
                placeholder="Post Title..."
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                className="w-full bg-white border-3 border-black p-3 text-xs font-black uppercase tracking-widest placeholder:text-black/30 mb-2 focus:outline-none focus:bg-yellow-50 transition-all"
              />
              <textarea
                placeholder="BROADCAST NEW CONTENT..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full bg-white border-3 border-black p-4 text-xs font-black uppercase tracking-widest placeholder:text-black/30 min-h-[80px] focus:outline-none focus:bg-yellow-50 transition-all mb-3"
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button className="p-2 bg-white border-3 border-black text-black hover:bg-cyan-400 brutalist-shadow">
                    <SparklesIcon className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={isTxPending || !postTitle || !postContent}
                  className={`btn-brutal ${isTxPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isTxPending ? 'Broadcasting...' : 'Execute Broadcast'}
                </button>
              </div>
            </div>
          ) : (
            <div className="brutalist-card p-8 text-center space-y-4">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-black mx-auto" />
              <p className="text-xs font-black uppercase text-black tracking-widest">Connect wallet to broadcast content</p>
            </div>
          )
        )}

        {/* Tab Content */}
        {activeTab === "feed" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Latest Broadcasts</h2>
              <button
                onClick={fetchPosts}
                disabled={isLoadingPosts}
                className={`flex items-center gap-2 text-[9px] font-black text-black hover:bg-cyan-400 px-2 py-1 border-2 border-black uppercase transition-all ${isLoadingPosts ? 'animate-pulse' : ''}`}
              >
                <ArrowPathIcon className={`w-3 h-3 ${isLoadingPosts ? 'animate-spin' : ''}`} />
                {isLoadingPosts ? 'Syncing...' : 'Sync Feed'}
              </button>
            </div>

            {filterUser && (
              <div className="flex items-center justify-between bg-blue-600/10 border border-blue-500/30 p-4 rounded-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-black">
                    {profiles[filterUser]?.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase text-slate-200">Posts by @{profiles[filterUser]?.username}</h2>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{profiles[filterUser]?.followerCount} Followers</p>
                  </div>
                </div>
                <button
                  onClick={() => setFilterUser(null)}
                  className="text-[10px] font-black uppercase text-blue-500 hover:underline"
                >
                  Clear Filter
                </button>
              </div>
            )}

            {filteredPosts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                creatorProfile={profiles[post.creator]}
                onTokenize={(p) => setSelectedPost(p)}
                onProfileClick={(addr) => setSelectedProfileAddress(addr)}
              />
            ))}
          </div>
        )}

        {activeTab === "market" && <Marketplace />}
        {activeTab === "tokens" && <TokenizeHub onMarketplaceClick={() => setActiveTab("market")} />}
        {activeTab === "vault" && <Vault />}
      </section>

      {/* 3. RIGHT SIDEBAR: Trends / Stats / Global Activity */}
      <aside className="hidden xl:flex flex-col w-[300px] gap-4 shrink-0">
        <div className="brutalist-card p-5 bg-yellow-400">
          <h3 className="text-xs font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            LIVE MARKET TRENDS
          </h3>
          <div className="space-y-3">
            {[
              { label: "STRK / USD", value: "$0.48", trend: "+2.4%", color: "text-emerald-500" },
              { label: "$ART Token", value: "1.2 STRK", trend: "-0.5%", color: "text-rose-500" },
              { label: "Gas Limit", value: "32 Gwei", trend: "Optimal", color: "text-black" },
            ].map((stat, i) => (
              <div key={i} className="flex justify-between items-center bg-white p-3 border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-[10px] font-black text-black uppercase">{stat.label}</span>
                <div className="text-right">
                  <div className="text-xs font-black">{stat.value}</div>
                  <div className={`text-[8px] font-black uppercase ${stat.trend.includes('-') ? 'bg-rose-500 text-white px-1' : 'bg-emerald-500 text-white px-1'}`}>{stat.trend}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="brutalist-card p-5 bg-cyan-400">
          <h3 className="text-xs font-black text-black uppercase tracking-widest mb-4">LATEST TRANSACTIONS</h3>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-[10px] flex items-start gap-2 border-l-4 border-black pl-3 py-1">
                <div>
                  <p className="text-black font-black uppercase tracking-tighter text-ellipsis overflow-hidden">0xBA...332 deployed contract</p>
                  <p className="text-black/60 italic font-bold uppercase">8 seconds ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MOBILE HUD (Bottom Nav) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-6 py-2 flex justify-between items-center z-50">
        <button className="p-3 text-blue-500"><HashtagIcon className="w-6 h-6" /></button>
        <div className="mt-[-40px]">
          <button className="p-4 bg-blue-600 rounded-full border-4 border-slate-950 shadow-xl"><PlusIcon className="w-6 h-6 text-white" /></button>
        </div>
        <button className="p-3 text-slate-500"><UserIcon className="w-6 h-6" /></button>
      </nav>

      {/* Modals */}
      {selectedPost && (
        <TokenizeModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onComplete={() => {
            setSelectedPost(null);
            setActiveTab("tokens");
          }}
        />
      )}

      <ProfileModal
        address={selectedProfileAddress}
        isOpen={!!selectedProfileAddress}
        onClose={() => setSelectedProfileAddress(null)}
      />

      <RoleExplainerModal isOpen={isExplainerOpen} onClose={() => setIsExplainerOpen(false)} />
    </div>
  );
}
