"use client";

import { XMarkIcon, WalletIcon, TrophyIcon, AdjustmentsHorizontalIcon, BanknotesIcon, ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import StakingModal from "./StakingModal";

interface PoolDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: any;
  position: any;
  isLoading: boolean;
  stake: (amount: string) => Promise<void>;
  claimRewards: () => Promise<void>;
  exitIntent: (amount: string) => Promise<void>;
  exitComplete: () => Promise<void>;
}

export default function PoolDetailsModal({
  isOpen,
  onClose,
  pool,
  position,
  isLoading,
  stake,
  claimRewards,
  exitIntent,
  exitComplete
}: PoolDetailsModalProps) {
  const [activeActionModal, setActiveActionModal] = useState<"stake" | "intent" | null>(null);

  if (!isOpen || !pool) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="brutalist-card bg-white w-full max-w-2xl p-8 relative animate-in fade-in zoom-in duration-300 border-4 border-black">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-yellow-400 transition-colors border-3 border-black brutalist-shadow bg-white"
        >
          <XMarkIcon className="w-6 h-6 text-black" />
        </button>

        <div className="mb-8 space-y-1">
          <div className="flex items-center gap-3">
             <h2 className="text-2xl font-black uppercase tracking-tight italic bg-yellow-400 px-3 py-1 border-3 border-black">
              // {pool.validatorName}
             </h2>
             <span className={`text-[10px] font-black px-2 py-1 border-2 border-black ${pool.network === 'mainnet' ? 'bg-green-400' : 'bg-purple-400'}`}>
                {pool.network.toUpperCase()}
             </span>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 select-all">Contract: {pool.poolContract}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Staked Balance Card */}
          <div className="brutalist-card p-6 border-cyan-400 bg-white flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-cyan-400 border-3 border-black flex items-center justify-center brutalist-shadow">
              <WalletIcon className="w-10 h-10 text-black" />
            </div>
            <div className="text-center">
              <span className="text-3xl font-black text-black uppercase tracking-tighter">
                {position?.staked?.toUnit() || "0"} STRK
              </span>
              <p className="text-[10px] text-black border-t-2 border-black mt-1 py-1 uppercase font-black tracking-widest">CURRENTLY STAKED</p>
            </div>
          </div>

          {/* Rewards & Stats Card */}
          <div className="brutalist-card p-6 space-y-4 border-yellow-400 bg-white">
             <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                   <TrophyIcon className="w-5 h-5 text-black" />
                   <span className="text-[10px] font-black uppercase text-black">Available Rewards</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-black bg-yellow-400 px-2 border border-black">
                    {position?.rewards?.toUnit() || "0"} STRK
                  </span>
                  {position && !position.rewards.isZero() && (
                    <button 
                      onClick={claimRewards}
                      disabled={isLoading}
                      className="text-[10px] font-black uppercase underline mt-1 disabled:opacity-50 hover:text-cyan-600"
                    >
                      Claim Now
                    </button>
                  )}
                </div>
             </div>
             
             <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                   <AdjustmentsHorizontalIcon className="w-5 h-5 text-black" />
                   <span className="text-[10px] font-black uppercase text-black">Commission</span>
                </div>
                <span className="text-sm font-black text-black">{pool?.commission || "0"}%</span>
             </div>

             {position?.unpoolTime && (
               <div className="flex justify-between items-center bg-red-50 p-2 border border-black">
                  <div className="flex items-center gap-2">
                     <BanknotesIcon className="w-5 h-5 text-red-600" />
                     <span className="text-[10px] font-black uppercase text-red-600">Withdrawal Window</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-black text-red-600">
                      {new Date() >= position.unpoolTime ? "READY TO WITHDRAW" : `Ready on ${position.unpoolTime.toLocaleDateString()}`}
                     </span>
                     {new Date() >= position.unpoolTime && (
                       <button 
                          onClick={exitComplete}
                          disabled={isLoading}
                          className="text-[10px] font-black uppercase underline disabled:opacity-50"
                       >
                          Finalize Withdrawal
                       </button>
                     )}
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setActiveActionModal("stake")}
            disabled={isLoading}
            className="btn-brutal flex items-center justify-center gap-3 py-5 text-lg disabled:opacity-50"
          >
            <ArrowDownIcon className="w-6 h-6" />
            Stake Tokens
          </button>
            
          <button 
            onClick={() => setActiveActionModal("intent")}
            disabled={isLoading || !position || position.staked.isZero()}
            className="btn-brutal-secondary flex items-center justify-center gap-3 py-5 text-lg disabled:opacity-50"
          >
            <ArrowUpIcon className="w-6 h-6" />
            Unstake Intent
          </button>
        </div>

        <p className="text-[10px] font-bold text-gray-500 uppercase text-center mt-6 max-w-sm mx-auto">
          Note: Staking requires the native Starknet protocol protocol. Unstaking follows a cooldown period after intent declaration.
        </p>

        {/* Action Modals - Nested slightly differently or managed by parent if preferred, 
            but for isolated UI we can keep them here */}
        <StakingModal 
          isOpen={activeActionModal === "stake"}
          onClose={() => setActiveActionModal(null)}
          title="STAKE STRK"
          actionLabel="STAKE NOW"
          onAction={stake}
          isLoading={isLoading}
        />

        <StakingModal 
          isOpen={activeActionModal === "intent"}
          onClose={() => setActiveActionModal(null)}
          title="DECLARE INTENT"
          actionLabel="SUBMIT INTENT"
          onAction={exitIntent}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
