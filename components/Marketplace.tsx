"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useMarketplace } from "@/lib/contexts/MarketplaceContext";
import { ShoppingBagIcon, TagIcon, ShieldCheckIcon, QuestionMarkCircleIcon, PencilSquareIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";
import MarketplaceInfoModal from "./MarketplaceInfoModal";
import TokenDetailModal from "./TokenDetailModal";

export default function Marketplace() {
  const { currentUser } = useAuth();
  const { listings, tokens, buyFromListing, buyToken, sellToken, getPrice, updatePrice, cancelListing, fetchListings } = useMarketplace();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState("1"); // Kept for modal or context if needed, but removed from card



  useEffect(() => {
    fetchListings();
  }, []); // Only fetch when navigating to this page

  return (
    <div className="space-y-8">


      <div className="space-y-4">
        <div className="flex justify-between items-center border-b-4 border-black pb-4">
          <h2 className="text-xl font-black uppercase tracking-widest text-black italic bg-yellow-400 px-3 py-1 border-3 border-black brutalist-shadow">// P2P MARKETPLACE</h2>
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="flex items-center gap-2 text-xs font-black uppercase text-black hover:bg-cyan-400 transition-colors bg-white px-4 py-2 border-3 border-black brutalist-shadow"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
            Marketplace Registry
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.filter(l => l.active).map(listing => (
            <MarketplaceCard
              key={listing.id}
              listing={listing}
              token={tokens[listing.contentToken]}
              currentUser={currentUser}
              onViewToken={() => setSelectedTokenAddress(listing.contentToken)}
              isEditing={editingListing === listing.id}
              onStartEdit={() => { setEditingListing(listing.id); setNewPrice(listing.pricePerToken); }}
              onCancelEdit={() => setEditingListing(null)}
              onUpdatePrice={async (price) => { await updatePrice(listing.id, price); setEditingListing(null); }}
              onCancelListing={async () => await cancelListing(listing.id)}
              newPrice={newPrice}
              setNewPrice={setNewPrice}
            />
          ))}
        </div>

      </div>

      {listings.length === 0 && (
        <div className="p-12 text-center border-4 border-dashed border-black">
          <p className="text-xl font-black uppercase text-black tracking-widest">No active listings in the mesh</p>
        </div>
      )}
      <MarketplaceInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
      <TokenDetailModal
        tokenAddress={selectedTokenAddress ?? ""}
        isOpen={!!selectedTokenAddress}
        onClose={() => setSelectedTokenAddress(null)}
      />
    </div>

  );
}



// ── MarketplaceCard Sub-component ──────────────────────────────────────────

import { RpcProvider } from "starknet";
import { STARKNET_RPC_URL } from "@/lib/constants";

interface CardProps {
  listing: any;
  token: any;
  currentUser: string | null;
  onViewToken: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdatePrice: (price: string) => Promise<void>;
  onCancelListing: () => Promise<void>;
  newPrice: string;
  setNewPrice: (p: string) => void;
}

function MarketplaceCard({ listing, token, currentUser, onViewToken, isEditing, onStartEdit, onCancelEdit, onUpdatePrice, onCancelListing, newPrice, setNewPrice }: CardProps) {
  const [onChainToken, setOnChainToken] = useState<{ name: string; symbol: string } | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!token && listing.contentToken) {
      const fetchMeta = async () => {
        setIsFetching(true);
        try {
          const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
          // Simple decode helper local to card or imported
          const resName = await provider.callContract({ contractAddress: listing.contentToken, entrypoint: "name", calldata: [] });
          const resSym = await provider.callContract({ contractAddress: listing.contentToken, entrypoint: "symbol", calldata: [] });

          // Rough decode (ContentToken uses ByteArray)
          const decode = (felts: any) => {
            const dataLen = Number(BigInt(felts[0]));
            let s = "";
            for (let i = 0; i < dataLen; i++) {
              const hex = felts[i + 1].replace("0x", "").padStart(62, "0");
              for (let j = 0; j < 62; j += 2) s += String.fromCharCode(parseInt(hex.slice(j, j + 2), 16));
            }
            const pending = felts[dataLen + 1].replace("0x", "");
            const pendingLen = Number(BigInt(felts[dataLen + 2]));
            for (let i = 0; i < pendingLen; i++) s += String.fromCharCode(parseInt(pending.slice(i * 2, i * 2 + 2), 16));
            return s.replace(/\0/g, "").trim();
          };

          setOnChainToken({ name: decode(resName), symbol: decode(resSym) });
        } catch (e) {
          console.error("Failed to fetch card meta:", e);
        } finally {
          setIsFetching(false);
        }
      };
      fetchMeta();
    }
  }, [token, listing.contentToken]);

  const isOwner = currentUser === listing.seller;
  const name = token?.name || onChainToken?.name || (isFetching ? "Syncing..." : "P2P Asset");
  const symbol = token?.symbol || onChainToken?.symbol || "";

  return (
    <div className="brutalist-card w-[400px] p-4 space-y-4 relative group flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-black text-black uppercase tracking-tight leading-none mb-1">{name}</h3>
            <span className="text-[9px] font-black text-black/40 uppercase">{symbol}</span>
            <div className="flex gap-2 mt-2">
              <span className="text-[9px] font-black bg-emerald-400 text-black border-2 border-black px-1.5 py-0.5 uppercase tracking-tighter flex items-center gap-1">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                Escrowed
              </span>
              {listing.autoSavePct > 0 && (
                <span className="text-[9px] font-black bg-pink-400 text-black border-2 border-black px-1.5 py-0.5 uppercase tracking-tighter">
                  {listing.autoSavePct}% Vaulted
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-black bg-emerald-400 border-2 border-black px-2 py-0.5 brutalist-shadow-sm">{listing.pricePerToken} STRK</span>
            <p className="text-[8px] text-black uppercase font-black mt-2">P2P ASK</p>
          </div>
        </div>

        <div className="flex justify-between items-center bg-black/5 p-2 border-2 border-black border-dashed">
          <div className="text-[9px] text-black font-black uppercase">
            Available: <span className="text-black bg-yellow-400 px-1 border border-black">{listing.amount} UNITs</span>
          </div>
          <a
            href={`https://sepolia.voyager.online/contract/${listing.contentToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] font-mono text-black/40 hover:text-black underline"
          >
            {listing.contentToken.substring(0, 8)}...
          </a>
        </div>
      </div>

      <div className="space-y-2">
        {isOwner ? (
          <div className="space-y-2 pt-2 border-t-2 border-black">
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="flex-1 bg-white border-2 border-black p-1 text-xs font-black focus:outline-none"
                />
                <button onClick={() => onUpdatePrice(newPrice)} className="bg-emerald-400 p-2 border-2 border-black brutalist-shadow-sm"><TagIcon className="w-4 h-4" /></button>
                <button onClick={onCancelEdit} className="bg-white p-2 border-2 border-black brutalist-shadow-sm"><XMarkIcon className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={onStartEdit} className="flex-1 bg-white border-2 border-black text-[9px] font-black uppercase py-2 hover:bg-yellow-400 transition-colors brutalist-shadow-sm flex items-center justify-center gap-1">
                  <PencilSquareIcon className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={onCancelListing} className="px-3 bg-red-400 border-2 border-black brutalist-shadow-sm text-black">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onViewToken}
            className="w-full py-3 text-[10px] font-black uppercase bg-cyan-400 text-black border-3 border-black hover:bg-yellow-400 hover:scale-[1.02] active:scale-[0.98] transition-all brutalist-shadow flex items-center justify-center gap-2"
          >
            Trade Token <ShoppingBagIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

