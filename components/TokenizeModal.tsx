"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useMarketplace } from "@/lib/contexts/MarketplaceContext";
import { useContentToken } from "@/lib/hooks/useContentToken";
import { getVoyagerUrl } from "@/lib/utils/starknet";
import { XMarkIcon, RocketLaunchIcon, LinkIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TokenizeModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function TokenizeModal({ post, isOpen, onClose, onComplete }: TokenizeModalProps) {
  const { currentUser } = useAuth();
  const { deployContentToken, linkTokenToPost, isDeploying, isLinking } = useContentToken();
  const { addToken, listToken } = useMarketplace();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(`${post?.title?.substring(0, 10) || ""} Token`);
  const [symbol, setSymbol] = useState(`${post?.title?.substring(0, 3).toUpperCase() || ""}`);
  const [basePrice, setBasePrice] = useState("0.01");
  const [priceStep, setPriceStep] = useState("0.001");
  const [initialSupply, setInitialSupply] = useState("0");
  const [deployedAddress, setDeployedAddress] = useState("");

  useEffect(() => {
    const existingToken = post?.token_address || post?.tokenAddress;
    if (isOpen && existingToken && existingToken !== "0x0") {
      setDeployedAddress(existingToken);
      setStep(3);
    } else if (isOpen) {
      // Reset for new tokenization
      setStep(1);
      setDeployedAddress("");
    }
  }, [isOpen, post]);

  if (!isOpen) return null;

  const postId = post?.post_id || post?.id;

  const handleCreateToken = async () => {
    if (!post?.post_id) {
      toast.error("Cannot tokenize mock content. Please link to a real on-chain post.");
      return;
    }
    try {
      const address = await deployContentToken({
        name,
        symbol,
        postId,
        initialSupply,
        basePriceStrk: basePrice,
        priceStepStrk: priceStep,
      });
      setDeployedAddress(address);

      // Sync with Token Hub immediately
      addToken({
        address,
        name,
        symbol,
        postId: postId.toString(),
        creator: currentUser || "",
        totalSupply: initialSupply,
        basePrice,
        priceStep,
        circulatingSold: initialSupply, // Initial supply is considered "sold" or issued
      });

      setStep(2);
    } catch {
      // toast handled inside hook
    }
  };

  const handleLinkToPost = async () => {
    if (!postId || !deployedAddress) return;
    try {
      await linkTokenToPost(postId, deployedAddress);
      // Automatically proceed to listing step
      setStep(3);
    } catch {
      // toast handled inside hook
    }
  };

  const [listAmount, setListAmount] = useState("10");
  const [listPrice, setListPrice] = useState("0.05");
  const [autoSavePct, setAutoSavePct] = useState(10);
  const [isListingOnMarketplace, setIsListingOnMarketplace] = useState(false);

  const handleListOnMarketplace = async () => {
    if (!deployedAddress) return;
    setIsListingOnMarketplace(true);
    try {
      await listToken(deployedAddress as any, listAmount, listPrice, autoSavePct);
      setStep(4);
    } catch (error) {
      console.error("Listing failed:", error);
    } finally {
      setIsListingOnMarketplace(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="brutalist-card w-full max-w-md overflow-hidden bg-white">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b-3 border-black bg-yellow-400">
          <h3 className="text-sm font-black uppercase tracking-widest text-black italic">// TOKENIZE CONTENT</h3>
          <button onClick={onClose} className="text-black hover:bg-black hover:text-white border-2 border-black p-1 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex px-6 py-4 bg-white border-b-3 border-black gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 border-3 border-black flex items-center justify-center text-xs font-black ${step >= s ? "bg-cyan-400 text-black brutalist-shadow" : "bg-white text-black/30"
                }`}>
                {s}
              </div>
              {s < 4 && <div className={`w-6 h-1 mx-1 border-y border-black ${step > s ? "bg-black" : "bg-black/10"}`} />}
            </div>
          ))}
          <span className="ml-auto text-[10px] font-black uppercase text-black bg-yellow-400 px-2 py-1 border-2 border-black self-center">
            {step === 1 ? "Configure" : step === 2 ? "Deploy" : step === 3 ? "List P2P" : "Complete"}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-black uppercase">Token name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border-3 border-black p-3 text-xs font-black focus:outline-none focus:bg-yellow-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-black uppercase">Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-white border-3 border-black p-3 text-xs font-black focus:outline-none focus:bg-yellow-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-black/40 uppercase">Decimals</label>
                  <input
                    type="text"
                    disabled
                    value="18"
                    className="w-full bg-black/5 border-3 border-black/20 p-3 text-xs font-black text-black/40"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 uppercase">Initial Supply (Premint)</label>
                <input
                  type="number"
                  value={initialSupply}
                  onChange={(e) => setInitialSupply(e.target.value)}
                  className="w-full bg-white border-3 border-blue-400 p-3 text-xs font-black focus:outline-none focus:bg-blue-50"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-600 uppercase">Base Price (STRK)</label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full bg-white border-3 border-emerald-400 p-3 text-xs font-black focus:outline-none focus:bg-emerald-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-600 uppercase">Price Step</label>
                  <input
                    type="number"
                    value={priceStep}
                    onChange={(e) => setPriceStep(e.target.value)}
                    className="w-full bg-white border-3 border-emerald-400 p-3 text-xs font-black focus:outline-none focus:bg-emerald-50"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center py-6 animate-in slide-in-from-right-4 duration-300">
              <div className="w-16 h-16 bg-cyan-400/20 flex items-center justify-center mx-auto border-3 border-black brutalist-shadow">
                <RocketLaunchIcon className="w-8 h-8 text-black" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-black uppercase tracking-widest">Contract Deployed!</h4>
                {deployedAddress && (
                  <p className="text-[10px] font-mono text-black break-all bg-black/5 border-2 border-black p-2">
                    {deployedAddress}
                  </p>
                )}
                <a
                  href={`https://sepolia.voyager.online/contract/${deployedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-black text-blue-500 hover:underline uppercase"
                >
                  View Contract on Voyager →
                </a>
              </div>
              <p className="text-[10px] text-black/60 font-black uppercase tracking-tight">
                Step 2: Link this token to your post on-chain via set_token_address.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-yellow-400 p-3 border-3 border-black brutalist-shadow mb-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest italic">// OPTIONAL: LIST ON MARKETPLACE</h4>
                <p className="text-[9px] font-black leading-tight mt-1 uppercase">List your tokens for P2P trading with escrow & saving.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-black uppercase">Amount to List</label>
                  <input
                    type="number"
                    value={listAmount}
                    onChange={(e) => setListAmount(e.target.value)}
                    className="w-full bg-white border-3 border-black p-3 text-xs font-black focus:outline-none focus:bg-yellow-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-black uppercase">Price per Token</label>
                  <input
                    type="number"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    className="w-full bg-white border-3 border-black p-3 text-xs font-black focus:outline-none focus:bg-yellow-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-pink-600 uppercase flex justify-between">
                  <span>Auto-Save to Vault</span>
                  <span>{autoSavePct}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={autoSavePct}
                  onChange={(e) => setAutoSavePct(parseInt(e.target.value))}
                  className="w-full h-2 bg-black/10 rounded-none appearance-none cursor-pointer accent-pink-500"
                />
                <p className="text-[8px] font-black text-black/40 uppercase mt-1 italic">
                  * earnings from sales will be automatically routed to your savings vault.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center py-8 animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-yellow-400 flex items-center justify-center mx-auto border-3 border-black brutalist-shadow">
                <CheckCircleIcon className="w-8 h-8 text-black" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-black uppercase tracking-widest">Protocol Sync Complete</h4>
                <p className="text-[10px] text-black/60 font-black uppercase">
                  Your content is now tokenized and listed on the marketplace.
                </p>
                {deployedAddress && (
                  <a
                    href={getVoyagerUrl(deployedAddress, 'contract')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-black text-blue-500 hover:underline uppercase block"
                  >
                    View ContentToken on Voyager →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t-3 border-black flex justify-end gap-3">
          {step === 1 && (
            <button
              onClick={handleCreateToken}
              disabled={isDeploying || !name || !symbol}
              className="btn-brutal w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeploying ? "// DEPLOYING ON-CHAIN..." : "1. Deploy ContentToken"}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleLinkToPost}
              disabled={isLinking || !deployedAddress}
              className="btn-brutal-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LinkIcon className="w-5 h-5" />
              {isLinking ? "Linking..." : "2. Link to Post"}
            </button>
          )}

          {step === 3 && (
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-white border-3 border-black text-[10px] font-black uppercase py-4 hover:bg-black/5"
              >
                Skip Listing
              </button>
              <button
                onClick={handleListOnMarketplace}
                disabled={isListingOnMarketplace || !listAmount}
                className="flex-2 btn-brutal disabled:opacity-50"
              >
                {isListingOnMarketplace ? "Listing..." : "3. List on Marketplace"}
              </button>
            </div>
          )}

          {step === 4 && (
            <button
              onClick={() => { onClose(); onComplete?.(); }}
              className="btn-brutal w-full flex items-center justify-center gap-2"
            >
              Finish & View Hub →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
