"use client";

import { XMarkIcon, ShieldCheckIcon, ArrowsRightLeftIcon, BanknotesIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/solid";

interface MarketplaceInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MarketplaceInfoModal({ isOpen, onClose }: MarketplaceInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white border-4 border-black w-full max-w-xl overflow-hidden brutalist-shadow-lg scale-in-center">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b-4 border-black bg-yellow-400">
          <h3 className="text-sm font-black uppercase tracking-tighter text-black italic font-mono">// MESH PROTOCOL v1.0.4</h3>
          <button onClick={onClose} className="text-black hover:bg-black hover:text-white p-1 border-2 border-black transition-all">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 bg-[#f0f0f0]">
          <div className="space-y-3 bg-white p-5 border-3 border-black brutalist-shadow-sm">
            <h4 className="text-sm font-black text-black uppercase flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
              P2P Escrow Logic
            </h4>
            <p className="text-[11px] text-black/70 leading-relaxed font-bold uppercase">
              The marketplace acts as a trustless escrow. When you list tokens, they are locked within the contract. This guarantees that buyers receive their assets instantly and sellers are protected from counterparty risk.
            </p>
          </div>

          <div className="space-y-4 bg-cyan-300 p-6 border-4 border-black brutalist-shadow-sm">
             <h4 className="text-[11px] font-black text-black uppercase tracking-widest italic">// PROTOCOL SETTLEMENT FLOW</h4>
             <div className="grid grid-cols-1 gap-4 font-mono text-[10px] font-black">
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                   <div className="flex items-center gap-2 text-black">
                      <ArrowsRightLeftIcon className="w-4 h-4" />
                      <span>BUYER DEPLOYMENT</span>
                   </div>
                   <span className="text-black bg-white px-2 border border-black">STRK TRANSFER</span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                   <div className="flex items-center gap-2 text-black">
                      <BanknotesIcon className="w-4 h-4" />
                      <span>VAULT SPLIT (SAVE)</span>
                   </div>
                   <span className="text-pink-500 bg-black px-2 py-0.5">AUTO-LOCKING %</span>
                </div>
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2 text-black">
                      <ArrowTrendingUpIcon className="w-4 h-4" />
                      <span>SELLER SETTLEMENT</span>
                   </div>
                   <span className="text-emerald-600 bg-white px-2 border border-black">NET LIQUID</span>
                </div>
             </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-1 space-y-2">
              <h4 className="text-[10px] font-black text-black uppercase tracking-tighter">Buying Tokens</h4>
              <p className="text-[10px] text-black/60 leading-tight font-bold">
                Acquire ContentTokens directly from the seller's active escrow. Prices are fixed in STRK by the seller.
              </p>
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-[10px] font-black text-black uppercase tracking-tighter">Selling Tokens</h4>
              <p className="text-[10px] text-black/60 leading-tight font-bold">
                List assets to receive STRK liquidity. A portion of every sell is automatically routed to your SavingsVault.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-yellow-400 border-t-4 border-black flex justify-between items-center">
          <p className="text-[9px] font-black text-black uppercase italic">Secured by Starknet Mainnet Grade Entropy</p>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-black text-yellow-400 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all brutalist-shadow-sm border-2 border-black"
          >
            I UNDERSTAND
          </button>
        </div>
      </div>
    </div>
  );
}
