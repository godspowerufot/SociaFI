"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useSocial } from "@/lib/contexts/SocialContext";
import PostCard from "@/components/PostCard";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, UserIcon, MapPinIcon, CalendarIcon } from "@heroicons/react/24/solid";
import TokenizeModal from "@/components/TokenizeModal";
import ProfileModal from "@/components/ProfileModal";
import { useState } from "react";
import { Post } from "@/lib/mock/types";

export default function ProfilePage() {
  const { address } = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { profiles, posts, follow, unfollow } = useSocial();

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedProfileAddress, setSelectedProfileAddress] = useState<string | null>(null);

  const profile = profiles[address as string];
  const creatorPosts = posts.filter(p => p.creator === address);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-slate-700" />
        </div>
        <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Protocol Address Not Found</p>
        <button 
          onClick={() => router.push("/")}
          className="text-[10px] font-black uppercase text-blue-500 hover:underline"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  const isMyProfile = currentUser === address;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header / Navigation */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[10px] font-black uppercase text-black hover:bg-yellow-400 transition-colors bg-white px-3 py-1 border-3 border-black brutalist-shadow"
      >
        <ArrowLeftIcon className="w-3 h-3" />
        Back to Network
      </button>

      {/* Profile Card */}
      <div className="bg-white border-4 border-black brutalist-shadow overflow-hidden">
        <div className="h-32 bg-black border-b-4 border-black relative overflow-hidden">
          <div className="absolute inset-0 bg-cyan-400 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
        </div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-28 h-28 bg-white border-4 border-black brutalist-shadow overflow-hidden">
              <img src={profile.avatarCid} alt="avatar" className="w-full h-full object-cover" />
            </div>
            {!isMyProfile && (
              <button 
                onClick={() => follow(address as string)}
                className="btn-brutal px-8 py-3"
              >
                Establish Connection
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-black uppercase tracking-tighter bg-yellow-400 inline-block px-3 border-3 border-black">{profile.username}</h1>
              <p className="text-[10px] text-black/60 font-black uppercase tracking-widest bg-black/5 w-fit px-2 py-1 border border-black/10">PROTOCOL ADDR: {address}</p>
            </div>
            
            <p className="text-sm text-black font-black uppercase leading-tight bg-white border-2 border-dashed border-black/20 p-4">
              {profile.bio || "No transmission sequence found for this creator node."}
            </p>

            <div className="flex flex-wrap gap-6 pt-2">
               <div className="flex items-center gap-2 text-black bg-emerald-400 px-2 py-1 border-2 border-black">
                  <MapPinIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Starknet Mainnet</span>
               </div>
               <div className="flex items-center gap-2 text-black/40">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
               </div>
            </div>

            <div className="flex gap-8 pt-6 border-t-3 border-black w-fit">
               <div className="text-center group">
                  <div className="text-2xl font-black text-black group-hover:bg-yellow-400 transition-colors px-1">{profile.followerCount}</div>
                  <div className="text-[9px] text-black/40 uppercase font-black tracking-widest">Followers</div>
               </div>
               <div className="text-center group">
                  <div className="text-2xl font-black text-black group-hover:bg-cyan-400 transition-colors px-1">{profile.followingCount}</div>
                  <div className="text-[9px] text-black/40 uppercase font-black tracking-widest">Following</div>
               </div>
               <div className="text-center group">
                  <div className="text-2xl font-black text-black group-hover:bg-emerald-400 transition-colors px-1">{creatorPosts.length}</div>
                  <div className="text-[9px] text-black/40 uppercase font-black tracking-widest">Broadcasts</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-black uppercase tracking-tighter italic bg-black text-white w-fit px-4 py-1">// CREATOR BROADCAST FEED</h2>
        {creatorPosts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {creatorPosts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                creatorProfile={profile}
                onTokenize={(p) => setSelectedPost(p)}
                onProfileClick={(addr) => setSelectedProfileAddress(addr)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border-4 border-black border-dashed rounded-sm p-16 text-center">
            <p className="text-xs font-black uppercase text-black/20 tracking-widest">No active communications found in current sector</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <TokenizeModal 
        post={selectedPost!} 
        isOpen={!!selectedPost} 
        onClose={() => setSelectedPost(null)}
        onComplete={() => setSelectedPost(null)}
      />

      <ProfileModal 
        address={selectedProfileAddress} 
        isOpen={!!selectedProfileAddress} 
        onClose={() => setSelectedProfileAddress(null)} 
      />
    </div>
  );
}
