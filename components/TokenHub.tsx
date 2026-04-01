"use client";

import { useMarketplace } from "@/lib/contexts/MarketplaceContext";
import { useSocial } from "@/lib/contexts/SocialContext";
import { CurrencyDollarIcon, MagnifyingGlassIcon, CubeIcon, InformationCircleIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import TokenDetailModal from "./TokenDetailModal";
import { ContentToken } from "@/lib/mock/types";

interface TokenHubProps {
  onMarketplaceClick?: () => void;
}

export default function TokenHub({ onMarketplaceClick }: TokenHubProps) {
  const { tokens } = useMarketplace();
  const { profiles } = useSocial();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToken, setSelectedToken] = useState<ContentToken | null>(null);

  const filteredTokens = Object.values(tokens).filter(token => 
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 brutalist-card p-6 bg-cyan-400">
        <div>
          <h2 className="text-2xl font-black text-black uppercase tracking-tighter flex items-center gap-3">
            <CubeIcon className="w-8 h-8 text-black" />
            Asset Hub
          </h2>
          <p className="text-[10px] text-black font-black uppercase tracking-widest mt-1 bg-white border border-black px-2 py-0.5 inline-block">
            Global registry of content-backed bonding curve assets
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
          <input 
            type="text" 
            placeholder="SCAN ASSET REGISTRY..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-3 border-black py-3 pl-12 pr-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:bg-yellow-50 transition-all"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTokens.length > 0 ? (
          filteredTokens.map((token) => (
            <div 
              key={token.address} 
              className="brutalist-card p-5 group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-1 bg-black text-yellow-400 border border-black uppercase tracking-tighter">
                      {token.symbol}
                    </span>
                    <h3 className="text-sm font-black text-black uppercase tracking-tight">{token.name}</h3>
                  </div>
                  <p className="text-[10px] text-black font-black uppercase mt-2 bg-yellow-400 px-2 py-0.5 border border-black inline-block">
                    By @{profiles[token.creator]?.username || token.creator.substring(0, 6)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-black uppercase tracking-widest">Hex Identity</div>
                  <div className="text-[9px] font-black text-black/60 uppercase">{token.address.substring(0, 12)}...</div>
                </div>
              </div>

              <div className="bg-white border-2 border-black p-3 grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[8px] font-black text-black uppercase">Aggregate Supply</div>
                  <div className="text-xs font-black text-black">{token.totalSupply} <span className="text-[8px] opacity-60">{token.symbol}</span></div>
                </div>
                <div>
                  <div className="text-[8px] font-black text-black uppercase">Distributed</div>
                  <div className="text-xs font-black text-black bg-cyan-400 px-1 border border-black inline-block">{token.circulatingSold} SOLD</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t-2 border-black">
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-black" />
                  <span className="text-sm font-black text-black bg-emerald-400 px-2 border border-black">{token.basePrice} STRK</span>
                </div>
                <button 
                  onClick={() => setSelectedToken(token)}
                  className="btn-brutal text-[9px] py-1 px-4"
                >
                  Inspect asset
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-slate-900 border border-slate-800 border-dashed rounded-sm">
             <CubeIcon className="w-12 h-12 text-slate-800 mx-auto mb-4" />
             <p className="text-xs font-black text-slate-600 uppercase tracking-widest">No deployed tokens found</p>
          </div>
        )}
      </div>

      {selectedToken && (
        <TokenDetailModal 
          token={selectedToken} 
          isOpen={!!selectedToken} 
          onClose={() => setSelectedToken(null)} 
          onMarketplaceClick={onMarketplaceClick}
        />
      )}
    </div>
  );
}
