"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useMarketplace } from "@/lib/contexts/MarketplaceContext";
import { ContentToken } from "@/lib/mock/types";
import { XMarkIcon, ShieldCheckIcon, BanknotesIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

interface ListTokenModalProps {
  token: ContentToken;
  isOpen: boolean;
  onClose: () => void;
  onListed?: () => void;
}

export default function ListTokenModal({ token, isOpen, onClose, onListed }: ListTokenModalProps) {
  const { currentUser } = useAuth();
  const { listToken } = useMarketplace();
  const [amount, setAmount] = useState("1");
  const [pricePerToken, setPricePerToken] = useState(token.basePrice);
  const [autoSavePct, setAutoSavePct] = useState(10);
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [isListing, setIsListing] = useState(false);

  if (!isOpen) return null;

  const totalEarnings = (parseFloat(amount || "0") * parseFloat(pricePerToken || "0")).toFixed(4);
  const protocolFee = (parseFloat(totalEarnings) * 0.02).toFixed(4);
  const vaultAmount = (parseFloat(totalEarnings) * autoSavePct / 100).toFixed(4);
  const netReceived = (parseFloat(totalEarnings) - parseFloat(protocolFee) - parseFloat(vaultAmount)).toFixed(4);

  const handleList = () => {
    setIsListing(true);
    setTimeout(() => {
      listToken(token.address, amount, pricePerToken, autoSavePct);
      setIsListing(false);
      setStep("done");
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-sm w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-emerald-600/20 border border-emerald-500/30 rounded-sm flex items-center justify-center text-[9px] font-black text-emerald-400">
              {token.symbol}
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 italic">
              // list_token()
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {step === "form" && (
          <>
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">content_token</label>
                <div className="bg-slate-950 border border-slate-800 rounded-sm p-3 text-[10px] font-mono text-slate-400 truncate">
                  {token.address}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase">amount (u256)</label>
                  <input
                    type="number"
                    value={amount}
                    min="1"
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-sm p-3 text-xs font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase">price_per_token (STRK)</label>
                  <input
                    type="number"
                    value={pricePerToken}
                    step="0.001"
                    onChange={(e) => setPricePerToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-sm p-3 text-xs font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-500 uppercase">auto_save_pct (0–100)</label>
                  <span className="text-[10px] font-black text-amber-400">{autoSavePct}% to Vault</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={autoSavePct}
                  onChange={(e) => setAutoSavePct(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[8px] text-slate-700 font-bold uppercase">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>

              {/* Payment Split Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-sm p-4 space-y-2.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Payment Split Preview</p>
                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                  <span className="text-slate-500">Total Earnings</span>
                  <span className="text-slate-300">{totalEarnings} STRK</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase border-t border-slate-800/50 pt-2">
                  <span className="text-slate-600">Protocol Fee (2%)</span>
                  <span className="text-rose-500">−{protocolFee} STRK</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                  <span className="text-amber-600 flex items-center gap-1">
                    <BanknotesIcon className="w-3 h-3" /> Vault ({autoSavePct}%)
                  </span>
                  <span className="text-amber-500">−{vaultAmount} STRK</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase border-t border-slate-800 pt-2">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheckIcon className="w-3 h-3" /> Net Received
                  </span>
                  <span className="text-emerald-400">{netReceived} STRK</span>
                </div>
              </div>

              <p className="text-[8px] text-slate-600 uppercase font-bold italic">
                * Tokens will be escrowed into the Marketplace contract until sold or cancelled.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/30 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all">
                Cancel
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={!amount || !pricePerToken || parseFloat(amount) <= 0}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest rounded-sm border-b-2 border-emerald-800 transition-all"
              >
                Review & List
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="p-6 space-y-4">
              <h4 className="text-xs font-black text-white uppercase">Confirm Listing</h4>
              <div className="space-y-2">
                {[
                  { label: "Token", value: `${token.name} (${token.symbol})` },
                  { label: "Amount to Escrow", value: `${amount} ${token.symbol}` },
                  { label: "Price per Token", value: `${pricePerToken} STRK` },
                  { label: "Auto-Save to Vault", value: `${autoSavePct}%` },
                  { label: "Net (after fees)", value: `${netReceived} STRK` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
                    <span className="text-[9px] font-black text-slate-500 uppercase">{row.label}</span>
                    <span className="text-[10px] font-black text-slate-200">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/30 flex gap-3">
              <button onClick={() => setStep("form")} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all">
                ← Back
              </button>
              <button
                onClick={handleList}
                disabled={isListing}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-sm border-b-2 border-emerald-800 transition-all"
              >
                {isListing ? "// ESCROWING..." : "Sign & List Token"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-14 h-14 bg-emerald-600/10 rounded-full flex items-center justify-center border border-emerald-500/20">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Listed Successfully</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                Your tokens are now escrowed and visible in the Trade Center.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { onClose(); onListed?.(); }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm border-b-2 border-blue-800 transition-all"
              >
                View in Trade Center →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
