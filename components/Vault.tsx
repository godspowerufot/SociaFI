"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useMarketplace } from "@/lib/contexts/MarketplaceContext";
import { WalletIcon, ArrowDownIcon, ArrowUpIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export default function Vault() {
  const { currentUser, strkBalance } = useAuth();
  const { vaultBalances, vaultEarnings, depositToVault, withdrawFromVault } = useMarketplace();
  const [amount, setAmount] = useState("1");
  const [isPending, setIsPending] = useState(false);


  const userVault = currentUser ? vaultBalances[currentUser] : null;
  const userEarnings = currentUser ? vaultEarnings[currentUser] : null;
  const strkInVault = userVault ? userVault[STRK_TOKEN_ADDRESS] || "0" : "0";
  const strkEarned = userEarnings ? userEarnings[STRK_TOKEN_ADDRESS] || "0" : "0";
  const strkInWallet = currentUser ? strkBalance[currentUser] || "0" : "0";


  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black uppercase tracking-widest text-black italic bg-yellow-400 px-3 py-1 border-3 border-black brutalist-shadow w-fit">// SAVINGS VAULT</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Balance Card */}
        <div className="brutalist-card p-6 border-cyan-400 bg-white flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-cyan-400 border-3 border-black flex items-center justify-center brutalist-shadow">
            <WalletIcon className="w-10 h-10 text-black" />
          </div>
          <div className="text-center">
            <span className="text-3xl font-black text-black uppercase tracking-tighter">{strkInVault} STRK</span>
            <p className="text-xs text-black border-t-2 border-black mt-1 py-1 uppercase font-black tracking-widest">SECURED IN VAULT</p>
          </div>
        </div>

        {/* Stats Card */}
        <div className="brutalist-card p-6 space-y-4 border-yellow-400">
           <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                 <TrophyIcon className="w-5 h-5 text-black" />
                 <span className="text-xs font-black uppercase text-black">Lifetime Earnings</span>
              </div>
              <span className="text-sm font-black text-black bg-yellow-400 px-2 border border-black">
                {parseFloat(strkEarned).toFixed(4)} STRK
              </span>

           </div>
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <ArrowUpIcon className="w-5 h-5 text-black" />
                 <span className="text-xs font-black uppercase text-black">Wallet Liquid</span>
              </div>
              <span className="text-sm font-black text-black bg-cyan-400 px-2 border border-black">{strkInWallet} STRK</span>
           </div>
        </div>
      </div>

      {/* Actions */}
      <div className="brutalist-card p-6 space-y-4 bg-white">
        <div className="flex gap-4">
          <div className="grow">
            <label className="block text-xs font-black text-black uppercase mb-2">AMOUNT TO TRANSFER</label>
            <input 
               type="number"
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
               className="w-full bg-white border-3 border-black p-4 text-sm font-black focus:outline-none focus:bg-yellow-50"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <button 
            onClick={async () => {
              setIsPending(true);
              try { await depositToVault(STRK_TOKEN_ADDRESS, amount); } 
              finally { setIsPending(false); }
            }}
            disabled={isPending || !currentUser}
            className="btn-brutal flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <ArrowDownIcon className="w-4 h-4" />}
            {isPending ? "Processing..." : "Lock In Vault"}
          </button>
          <button 
            onClick={async () => {
              setIsPending(true);
              try { await withdrawFromVault(STRK_TOKEN_ADDRESS, amount); } 
              finally { setIsPending(false); }
            }}
            disabled={isPending || !currentUser}
            className="btn-brutal-secondary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <ArrowUpIcon className="w-4 h-4" />}
            {isPending ? "Processing..." : "Release Liquid"}
          </button>

        </div>
      </div>
    </div>
  );
}
