"use client";

import { useState } from "react";
import { Post, UserProfile } from "@/lib/mock/types";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSocialContract } from "@/lib/hooks/useSocialContract";
import { compareAddresses } from "@/lib/utils/starknet";
import { HandThumbUpIcon, TagIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface PostCardProps {
  post: any;
  creatorProfile?: UserProfile;
  onTokenize?: (post: any) => void;
  onProfileClick?: (address: string) => void;
}

export default function PostCard({ post, creatorProfile, onTokenize, onProfileClick }: PostCardProps) {
  const { currentUser } = useAuth();
  const { tipCreator, isTxPending } = useSocialContract();

  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("0.5");
  const [isTipping, setIsTipping] = useState(false);

  // Normalize fields between mock and contract
  const id = post.post_id || post.id;
  const creator = post.creator;
  const title = post.title;
  const content = post.content_cid || post.contentCid;
  const timestamp = post.timestamp;
  const tokenAddress = post.token_address || post.tokenAddress;
  const tipTotal = post.tip_total || post.tipTotal;
  const isOnChain = Boolean(post.post_id);
  const isOwner = compareAddresses(currentUser, creator);

  const handleTipConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const amountFloat = parseFloat(tipAmount);
    if (!amountFloat || amountFloat <= 0) return;

    // Convert STRK to wei (18 decimals)
    const amountWei = BigInt(Math.round(amountFloat * 1e9)) * BigInt(1e9);

    setIsTipping(true);
    try {
      await tipCreator(id, amountWei.toString());
      setIsTipModalOpen(false);
      setTipAmount("0.5");
    } catch (err) {
      // toast is handled inside tipCreator
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <>
      <article
        className="brutalist-card transition-all overflow-hidden"
      >
        <div className="flex justify-between items-center px-4 py-2 bg-yellow-400 border-b-3 border-black">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProfileClick?.(creator);
              }}
              className="text-[10px] font-black text-black tracking-tighter uppercase italic hover:bg-white px-1 border border-black transition-colors"
            >
              // {creatorProfile?.username || creator.substring(0, 6)}
            </button>
            {currentUser && !isOwner && (
              <span className="text-[8px] font-black uppercase text-white bg-black px-1.5 py-0.5">
                CREATOR
              </span>
            )}
          </div>
          <span className="text-[9px] font-black text-black uppercase italic">
            {new Date(Number(timestamp) > 1000000000000 ? Number(timestamp) : Number(timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="p-4 space-y-2 bg-white">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-black text-black uppercase tracking-tight">{title}</h4>
            <span className="text-[8px] font-black text-black bg-cyan-400 border-2 border-black px-1.5 py-0.5 uppercase">
              ID: {id}
            </span>
          </div>
          <p className="text-xs text-black font-medium leading-relaxed uppercase">{content}</p>

          {tokenAddress && tokenAddress !== "0x0" && (
            <a
              href={`https://sepolia.voyager.online/tx/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-black border-2 border-black px-2 py-1 w-fit brutalist-shadow transition-transform hover:scale-105 active:scale-95 group"
            >
              <TagIcon className="w-3 h-3 text-yellow-400" />
              <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest group-hover:underline">Token: {tokenAddress.substring(0, 10)}...</span>
            </a>
          )}
        </div>

        <div className="flex px-4 py-3 bg-white border-t-3 border-black gap-6 items-center">
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-black hover:bg-yellow-400 border-2 border-transparent hover:border-black px-1 transition-all"
          >
            <HandThumbUpIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black">0</span>
          </button>


          <button
            onClick={(e) => { e.stopPropagation(); setIsTipModalOpen(true); }}
            className="btn-brutal text-[9px] py-1 px-3"
          >
            Tip Creator
          </button>


          <div className="text-[10px] font-black bg-black text-yellow-400 px-2 py-1 uppercase tracking-widest border-2 border-black">
            Total: {Number(tipTotal) > 0 ? `${(Number(tipTotal) / 1e18).toFixed(2)} STRK` : "0 STRK"}
          </div>


          <div className="ml-auto">
            {!tokenAddress || tokenAddress === "0x0" ? (
              <button
                onClick={(e) => { e.stopPropagation(); onTokenize?.(post); }}
                className="btn-brutal-secondary text-[9px] py-1 px-3"
              >
                <SparklesIcon className="w-3 h-3" />
                Tokenize
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onTokenize?.(post); }}
                className="grow btn-brutal flex items-center justify-center gap-2 text-[9px] py-1 px-3"
              >
                <TagIcon className="w-3 h-3" />
                List on Marketplace
              </button>
            )}
          </div>


          {!isOwner && (!tokenAddress || tokenAddress === "0x0") && (
            <div className="ml-auto text-[9px] font-black text-black uppercase tracking-widest bg-yellow-400 px-1 border border-black">
              {creator.substring(0, 6)}...{creator.substring(34)}
            </div>
          )}
        </div>
      </article>

      {/* Tip Modal */}
      {isTipModalOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setIsTipModalOpen(false); }}
        >
          <div
            className="brutalist-card bg-white w-full max-w-sm p-6 space-y-5 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-black uppercase tracking-widest">Tip Creator</h3>
              <button
                onClick={() => setIsTipModalOpen(false)}
                className="text-black hover:bg-yellow-400 border-2 border-black p-1 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Creator info */}
            <div className="bg-yellow-400 border-3 border-black p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-black flex items-center justify-center font-black text-white text-xs uppercase">
                {creatorProfile?.username?.substring(0, 2) || creator.substring(2, 4).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-black text-black uppercase tracking-wider">
                  @{creatorProfile?.username || `${creator.substring(0, 8)}...`}
                </p>
                <p className="text-[9px] text-black/60 font-black uppercase">Post ID: {id}</p>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-black uppercase tracking-widest">
                Amount (STRK)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="0.5"
                  className="flex-1 bg-white border-3 border-black p-3 text-sm font-black text-black focus:outline-none focus:bg-yellow-50 transition-all"
                />
                <span className="flex items-center px-3 bg-black text-yellow-400 font-black text-xs uppercase border-3 border-black">
                  STRK
                </span>
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2">
                {["0.1", "0.5", "1", "5"].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTipAmount(amt)}
                    className={`flex-1 text-[9px] font-black uppercase py-1 border-2 border-black transition-all ${tipAmount === amt ? 'bg-yellow-400' : 'bg-white hover:bg-cyan-400'}`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleTipConfirm}
              disabled={isTipping || !tipAmount || parseFloat(tipAmount) <= 0}
              className="btn-brutal w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTipping ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-yellow-400 rounded-full animate-spin" />
                  Sending Tip...
                </>
              ) : (
                `Send ${tipAmount || "0"} STRK`
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
