"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useStaking } from "@/lib/hooks/useStaking";
import { WalletIcon, GlobeAltIcon, ShieldCheckIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import PoolDetailsModal from "./PoolDetailsModal";

export default function Vault() {
  const { currentUser, connectWallet } = useAuth();
  const { 
    pools, selectedPool, setSelectedPool, position, isLoading, 
    stake, claimRewards, exitIntent, exitComplete 
  } = useStaking();
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handlePoolSelect = (poolId: string) => {
    setSelectedPool(poolId);
    setIsDetailsOpen(true);
  };

  const currentPool = pools.find(p => p.poolContract === selectedPool);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 py-24 bg-white border-4 border-black brutalist-shadow">
        <div className="w-24 h-24 bg-yellow-400 border-4 border-black brutalist-shadow flex items-center justify-center animate-bounce">
          <WalletIcon className="w-12 h-12 text-black" />
        </div>
        <div className="text-center space-y-4 px-6">
          <h2 className="text-3xl font-black uppercase tracking-tight italic bg-black text-white px-6 py-2 border-3 border-black inline-block">
            // AUTH REQUIRED
          </h2>
          <p className="text-sm font-bold uppercase text-gray-500 max-w-sm mx-auto leading-tight">
            Natively stake your STRK to support the network and earn premium rewards. Connect your wallet to begin.
          </p>
        </div>
        <button 
          onClick={connectWallet}
          className="btn-brutal px-16 py-5 text-xl"
        >
          CONNECT STARKNET WALLET
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b-4 border-black pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-black italic bg-yellow-400 px-4 py-2 border-3 border-black brutalist-shadow w-fit">
            // STAKING HUB
          </h2>
          <p className="text-[10px] font-black text-gray-500 uppercase mt-2 tracking-tighter">Choose a validator pool to manage your delegation</p>
        </div>
        <div className="hidden md:flex gap-4">
           <div className="flex items-center gap-2 px-3 py-1 bg-white border-2 border-black truncate max-w-[200px]">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse border border-black" />
              <span className="text-[8px] font-black uppercase truncate">{currentUser}</span>
           </div>
        </div>
      </div>

      {/* Global Stats Overview - Subtle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="brutalist-card p-4 bg-cyan-400 flex flex-col justify-between border-black h-24">
            <span className="text-[10px] font-black uppercase">Active Pools</span>
            <span className="text-2xl font-black underline">{pools.length}</span>
         </div>
         <div className="brutalist-card p-4 bg-white flex flex-col justify-between border-black h-24">
            <span className="text-[10px] font-black uppercase">Your Network Strength</span>
            <GlobeAltIcon className="w-8 h-8 text-black opacity-20" />
         </div>
         <div className="brutalist-card p-4 bg-yellow-400 flex flex-col justify-between border-black h-24">
            <span className="text-[10px] font-black uppercase">Protocol Security</span>
            <ShieldCheckIcon className="w-8 h-8 text-black opacity-20" />
         </div>
      </div>

      {/* Pool Selector Grid */}
      <div className="space-y-4">
        <label className="block text-xs font-black text-black uppercase tracking-widest italic">// AVAILABLE VALIDATORS</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <button
              key={pool.poolContract}
              onClick={() => handlePoolSelect(pool.poolContract)}
              className="group brutalist-card p-6 bg-white border-4 border-black text-left transition-all hover:bg-yellow-50 hover:-translate-y-1 hover:translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0 active:translate-y-0"
            >
              <div className="flex flex-col h-full justify-between gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-lg font-black uppercase block leading-none">{pool.validatorName}</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Protocol Validator</span>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 border-2 border-black ${pool.network === 'mainnet' ? 'bg-green-400' : 'bg-purple-400'}`}>
                    {pool.network.toUpperCase()}
                  </span>
                </div>
                
                <div className="border-t-2 border-black pt-3 flex justify-between items-center">
                   <div className="flex flex-col">
                      <span className="text-[7px] font-black text-gray-500 uppercase">Commission</span>
                      <span className="text-xs font-black">{pool.commission || "0"}%</span>
                   </div>
                   <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                      <ArrowDownIcon className="w-4 h-4 -rotate-90" />
                   </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[8px] font-bold text-gray-400 uppercase text-center max-w-lg mx-auto py-8">
        Official Starknet Staking SDK Integration. Staking involves protocol level interactions. Ensure you understand the cooldown periods for unstaking.
      </p>

      {/* Main Pool Details Modal */}
      <PoolDetailsModal 
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        pool={currentPool}
        position={position}
        isLoading={isLoading}
        stake={stake}
        claimRewards={claimRewards}
        exitIntent={exitIntent}
        exitComplete={exitComplete}
      />
    </div>
  );
}
