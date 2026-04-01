"use client";

import { UserProfile, Post, ContractAddress } from "@/lib/mock/types";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSocial } from "@/lib/contexts/SocialContext";
import { useMarketplace } from "@/lib/contexts/MarketplaceContext";
import { useSocialContract } from "@/lib/hooks/useSocialContract";
import { useProfileContract } from "@/lib/hooks/useProfileContract";
import PostCard from "./PostCard";

import {
  XMarkIcon,
  UserCircleIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  ShoppingBagIcon
} from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";

interface ProfileModalProps {
  address: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "feed" | "followers" | "following" | "settings" | "register";

export default function ProfileModal({ address, isOpen, onClose }: ProfileModalProps) {
  const { currentUser } = useAuth();
  const {
    profiles,
    posts,
    registerProfile,
    updateProfile,
    follow,
    unfollow,
    fetchProfile,
  } = useSocial();

  const { vaultBalances } = useMarketplace();
  const { getPostsByCreator } = useSocialContract();

  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [isEditing, setIsEditing] = useState(false);
  const [creatorPosts, setCreatorPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Registration
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarCid, setAvatarCid] = useState("https://api.dicebear.com/7.x/identicon/svg?seed=" + address);

  // Profile editing
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);


  const profile: UserProfile | undefined = address ? profiles[address] : undefined;
  const isOwnProfile = currentUser === address;
  const isRegistered = !!profile?.registered;

  const [followersAddresses, setFollowersAddresses] = useState<string[]>([]);
  const [followingAddresses, setFollowingAddresses] = useState<string[]>([]);
  const [isGraphLoading, setIsGraphLoading] = useState(false);

  const { getFollowers, getFollowing } = useProfileContract();

  useEffect(() => {
    if (profile) {
      setEditBio(profile.bio || "");
      setEditAvatar(profile.avatarCid || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("feed");
      setIsEditing(false);
      setCreatorPosts([]);
    } else if (address) {
      fetchCreatorPosts();
      if (isRegistered) {
        fetchSocialGraph();
      } else if (isOwnProfile) {
        setActiveTab("register");
      }
    }
  }, [isOpen, address, isRegistered]);

  const fetchCreatorPosts = async () => {
    if (!address) return;
    setIsLoadingPosts(true);
    try {
      const livePosts = await getPostsByCreator(address);
      setCreatorPosts(livePosts);
    } catch (error) {
      console.error("Failed to fetch creator posts:", error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const fetchSocialGraph = async () => {
    if (!address) return;
    setIsGraphLoading(true);
    try {
      const [fers, fing] = await Promise.all([
        getFollowers(address),
        getFollowing(address)
      ]);
      setFollowersAddresses(fers);
      setFollowingAddresses(fing);
      
      // Pre-fetch profiles for the lists
      await Promise.all([...fers, ...fing].map(addr => fetchProfile(addr)));
    } catch (e) {
      console.error("Failed to fetch graph:", e);
    } finally {
      setIsGraphLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRegister = async () => {
    if (!username.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      await registerProfile(username, bio, avatarCid);
      setActiveTab("feed");
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await updateProfile(editBio, editAvatar);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollow = async () => {
    if (!address || isProcessing) return;
    setIsProcessing(true);
    try {
      await follow(address);
      fetchSocialGraph();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnfollow = async (target: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await unfollow(target);
      fetchSocialGraph();
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    ...(isRegistered ? [
      { id: "feed" as Tab, label: "Feed" },
      { id: "followers" as Tab, label: `Followers (${profile?.followerCount ?? 0})` },
      { id: "following" as Tab, label: `Following (${profile?.followingCount ?? 0})` },
    ] : []),
    ...(isOwnProfile && !isRegistered ? [{ id: "register" as Tab, label: "Register Identity" }] : []),
    ...(isOwnProfile && isRegistered ? [{ id: "settings" as Tab, label: "Settings" }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end p-4 pt-16 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="brutalist-card bg-white w-full max-w-lg h-[calc(100vh-6rem)] flex flex-col overflow-hidden slide-in-from-right-8 animate-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 justify-between items-center px-5 py-4 border-b-3 border-black bg-yellow-400">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-black italic font-mono">
            {isRegistered ? `// PROFILE_ID: ${profile?.username}` : "// IDENTITY_LAYER_NULL"}
          </h3>
          <button onClick={onClose} className="text-black hover:bg-black hover:text-white border-2 border-black p-1 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Global Banner and Navigation */}
        <div className="shrink-0 bg-white">
          <div className="h-28 bg-black border-b-4 border-black relative overflow-hidden">
            <div className="absolute inset-0 bg-cyan-400 opacity-30" style={{ backgroundImage: 'linear-gradient(45deg, black 25%, transparent 25%, transparent 50%, black 50%, black 75%, transparent 75%, transparent)', backgroundSize: '10px 10px' }}></div>
          </div>
          <div className="px-6 pb-4 -mt-14 flex justify-between items-end relative z-10">
            <div className="bg-white border-4 border-black p-1 rotate-[-2deg] brutalist-shadow-lg">
              <img
                src={profile?.avatarCid || `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`}
                alt="avatar"
                className="w-24 h-24 border-2 border-black bg-white object-cover"
              />
            </div>
            <div className="flex gap-2 mb-2">
              {!isOwnProfile && currentUser && isRegistered && (
                <button
                  onClick={handleFollow}
                  disabled={isProcessing}
                  className="bg-emerald-400 border-4 border-black px-6 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white transition-all brutalist-shadow active:translate-y-1"
                >
                  {isProcessing ? "SYNCING..." : "+ Follow Node"}
                </button>
              )}
              {isOwnProfile && isRegistered && activeTab !== "settings" && (
                <button
                  onClick={() => setActiveTab("settings")}
                  className="bg-yellow-400 border-4 border-black text-black text-[10px] font-black uppercase px-6 py-2.5 hover:translate-x-1 hover:-translate-y-1 transition-all flex items-center gap-2 brutalist-shadow"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  Protocol Setup
                </button>
              )}
            </div>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-black uppercase tracking-tighter italic">
                {isRegistered ? profile?.username : "UNINITIALIZED_NODE"}
              </h2>
              <p className="text-[9px] font-mono text-black/40 font-black truncate max-w-[200px]">{address}</p>
            </div>

            {isRegistered ? (
               profile?.bio && (
                  <p className="text-[11px] text-black font-black uppercase leading-tight bg-white border-2 border-black p-3 brutalist-shadow-sm italic">
                    "{profile.bio}"
                  </p>
                )
            ) : (
                <p className="text-[11px] text-black font-black uppercase leading-tight bg-cyan-100 border-2 border-black p-3 brutalist-shadow-sm italic">
                    Identity not registered on MESH. System restricted to read-only.
                </p>
            )}

            {isRegistered && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white border-2 border-black p-2 text-center brutalist-shadow-sm">
                    <span className="block text-xs font-black">{profile?.followerCount}</span>
                    <span className="text-[8px] font-black uppercase text-black/50">Followers</span>
                  </div>
                  <div className="bg-white border-2 border-black p-2 text-center brutalist-shadow-sm">
                    <span className="block text-xs font-black">{profile?.followingCount}</span>
                    <span className="text-[8px] font-black uppercase text-black/50">Following</span>
                  </div>
                  <div className="bg-emerald-400 border-2 border-black p-2 text-center brutalist-shadow-sm">
                    <span className="block text-xs font-black">{creatorPosts.length}</span>
                    <span className="text-[8px] font-black uppercase">Blocks</span>
                  </div>
                </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b-4 border-black px-4 bg-white overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all -mb-[4px] whitespace-nowrap ${activeTab === tab.id
                    ? "bg-black text-white border-x-4 border-t-4 border-black z-10"
                    : "bg-white text-black/40 border-x-2 border-t-2 border-transparent hover:text-black"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto bg-[#fafafa]">
          {/* Register Tab */}
          {activeTab === "register" && (
            <div className="p-8 space-y-6 bg-[#f8f8f8]">
              <div className="text-center space-y-4 pb-4">
                <div className="w-20 h-20 mx-auto bg-cyan-400 border-4 border-black flex items-center justify-center brutalist-shadow rotate-3 hover:rotate-0 transition-transform">
                  <UserCircleIcon className="w-12 h-12 text-black" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-black text-black uppercase tracking-tighter italic">Mint Identity</p>
                  <p className="text-[9px] text-black/50 font-black uppercase tracking-[0.2em]">
                    Deploy your social node to Starknet
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Username (Immutable)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                    placeholder="E.G. STARK_ARCHITECT"
                    className="w-full bg-white border-3 border-black p-4 text-xs font-black text-black focus:outline-none focus:bg-yellow-100 brutalist-shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Bio / Mission</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="WHAT ARE YOU BUILDING?"
                    className="w-full bg-white border-3 border-black p-4 text-xs font-black text-black focus:outline-none focus:bg-pink-50 resize-none brutalist-shadow-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={!username.trim() || isProcessing}
                className="btn-brutal w-full mt-4 flex items-center justify-center gap-3 disabled:opacity-50 h-16 text-sm"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-3 border-black border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircleIcon className="w-6 h-6 text-black" />
                    INIT_IDENTITY_SYNC
                  </>
                )}
              </button>
            </div>
          )}

              {/* Feed Tab */}
              {activeTab === "feed" && (
                <div className="p-5 space-y-6">
                  {isLoadingPosts ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-12 h-12 border-4 border-black border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
                      <p className="text-[10px] font-black text-black uppercase tracking-widest animate-pulse font-mono">
                        FETCHING_BLOCKCHAIN_BROADCASTS...
                      </p>
                    </div>
                  ) : creatorPosts.length > 0 ? (
                    creatorPosts.map(post => (
                      <PostCard key={post.id} post={post} creatorProfile={profile} />
                    ))
                  ) : (
                    <div className="py-20 text-center border-4 border-dashed border-black/5">
                      <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">
                        NO_SIGNALS_DETECTED
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Followers Tab */}
              {activeTab === "followers" && (
                <div className="p-5 space-y-4">
                  {isGraphLoading ? (
                    <div className="py-10 text-center"><div className="w-6 h-6 border-3 border-black border-t-yellow-400 rounded-full animate-spin mx-auto"></div></div>
                  ) : followersAddresses.length === 0 ? (
                    <div className="py-20 text-center border-4 border-dashed border-black/10">
                      <UserGroupIcon className="w-12 h-12 text-black/10 mx-auto mb-4" />
                      <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">MESH_NODE_ISOLATION</p>
                    </div>
                  ) : (
                    followersAddresses.map(addr => {
                      const p = profiles[addr];
                      return (
                        <div key={addr} className="flex items-center gap-4 p-4 bg-white border-3 border-black brutalist-shadow-sm hover:translate-x-1 transition-transform">
                          <img src={p?.avatarCid || `https://api.dicebear.com/7.x/identicon/svg?seed=${addr}`} alt="" className="w-12 h-12 border-2 border-black bg-slate-100" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-black uppercase truncate">{p?.username || "Node " + addr.substring(0,6)}</p>
                            <p className="text-[8px] text-black/50 font-black uppercase truncate">{addr}</p>
                          </div>
                          <button className="text-[9px] font-black bg-yellow-400 border-2 border-black px-4 py-2 uppercase hover:bg-black hover:text-white transition-colors">VIEW</button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Following Tab */}
              {activeTab === "following" && (
                <div className="p-5 space-y-4">
                   {isGraphLoading ? (
                    <div className="py-10 text-center"><div className="w-6 h-6 border-3 border-black border-t-cyan-400 rounded-full animate-spin mx-auto"></div></div>
                  ) : followingAddresses.length === 0 ? (
                    <div className="py-20 text-center border-4 border-dashed border-black/10">
                      <UserGroupIcon className="w-12 h-12 text-black/10 mx-auto mb-4" />
                      <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">NO_DOWNSTREAM_MESH</p>
                    </div>
                  ) : (
                    followingAddresses.map(addr => {
                      const p = profiles[addr];
                      return (
                        <div key={addr} className="flex items-center gap-4 p-4 bg-white border-3 border-black brutalist-shadow-sm">
                          <img src={p?.avatarCid || `https://api.dicebear.com/7.x/identicon/svg?seed=${addr}`} alt="" className="w-12 h-12 border-2 border-black bg-slate-100" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-black uppercase truncate">{p?.username || "Node " + addr.substring(0,6)}</p>
                            <p className="text-[8px] text-black/50 font-black uppercase truncate">{addr}</p>
                          </div>
                          {isOwnProfile && (
                            <button
                              onClick={() => handleUnfollow(addr)}
                              disabled={isProcessing}
                              className="text-[9px] font-black bg-red-400 text-black border-2 border-black px-4 py-2 uppercase hover:bg-black hover:text-white transition-colors"
                            >
                              DROP
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Settings Tab — Only for own profile */}
              {activeTab === "settings" && isOwnProfile && (
                <div className="p-8 space-y-8 bg-[#fdfdfd]">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-black uppercase tracking-[0.3em] font-mono ml-1">// UPDATE_BIO</label>
                    <textarea
                      rows={4}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full bg-white border-4 border-black p-5 text-xs font-black text-black focus:outline-none focus:ring-4 focus:ring-yellow-400/20 resize-none brutalist-shadow-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-black uppercase tracking-[0.3em] font-mono ml-1">// UPDATE_AVATAR_CID</label>
                    <input
                      type="text"
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      className="w-full bg-white border-4 border-black p-5 text-xs font-black text-black focus:outline-none focus:ring-4 focus:ring-cyan-400/20 brutalist-shadow-sm"
                    />
                  </div>
                  
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isProcessing}
                    className="btn-brutal w-full h-16 flex items-center justify-center gap-4 text-sm"
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-4 border-black border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-7 h-7" />
                        SYNC_CHANGES_TO_CHAIN
                      </>
                    )}
                  </button>
                  
                  <div className="pt-10 border-t-4 border-black space-y-4">
                    <div className="text-[10px] text-black bg-cyan-400 inline-block px-3 py-1 border-2 border-black uppercase font-black italic tracking-widest">ENCRYPTED_NODE_ADDR</div>
                    <div className="text-[9px] text-black/40 font-mono break-all bg-black/5 p-4 border-2 border-black border-dashed">{address}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


