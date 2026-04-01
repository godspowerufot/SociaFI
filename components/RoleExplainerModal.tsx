"use client";

import { XMarkIcon, CubeIcon, BuildingStorefrontIcon, BoltIcon, ShieldCheckIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

interface RoleExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  { label: "Pricing",         hub: "Algorithmic bonding curve",  market: "User-set fixed price (P2P)" },
  { label: "Market Type",     hub: "Primary market",             market: "Secondary market" },
  { label: "Escrow",          hub: false,                         market: true },
  { label: "Auto-Save Vault", hub: false,                         market: true },
  { label: "Cancel / Edit",   hub: false,                         market: true },
];

function Check() {
  return <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
}
function Cross() {
  return <XCircleIcon className="w-4 h-4 text-slate-700 shrink-0" />;
}

export default function RoleExplainerModal({ isOpen, onClose }: RoleExplainerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-sm w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 italic">
              // PROTOCOL ARCHITECTURE
            </h3>
            <p className="text-[9px] font-bold text-slate-600 uppercase mt-0.5 tracking-widest">
              Understanding the two market layers
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Token Hub */}
          <div className="bg-slate-950 border border-blue-500/20 rounded-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-sm flex items-center justify-center">
                <CubeIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight">Token Hub</h4>
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Primary Market</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              Buy and sell content tokens <span className="text-white font-black">directly from the token contract</span> at prices determined by a bonding curve. Every purchase increases the price — early buyers benefit most.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-start gap-2">
                <BoltIcon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-400 uppercase">Instant liquidity via bonding curve</p>
              </div>
              <div className="flex items-start gap-2">
                <BoltIcon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-400 uppercase">Price rises with every token minted</p>
              </div>
              <div className="flex items-start gap-2">
                <BoltIcon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-400 uppercase">Sell back at 95% of buy price (5% spread)</p>
              </div>
            </div>
          </div>

          {/* Marketplace */}
          <div className="bg-slate-950 border border-emerald-500/20 rounded-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600/20 border border-emerald-500/30 rounded-sm flex items-center justify-center">
                <BuildingStorefrontIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight">Marketplace</h4>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Secondary Market</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              Token <span className="text-white font-black">holders</span> list their existing tokens for sale at a price they set. Tokens are escrowed by the contract — safe for both buyer and seller until the trade settles.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-start gap-2">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-400 uppercase">Escrow protects both parties</p>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-400 uppercase">Auto-save % of earnings to Vault</p>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-400 uppercase">Cancel or reprice listing anytime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="px-6 pb-2">
          <div className="bg-slate-950/80 border border-slate-800 rounded-sm overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-950 text-[9px] font-black uppercase tracking-widest text-slate-500 px-4 py-2 border-b border-slate-800">
              <span>Feature</span>
              <span className="text-center text-blue-500">Token Hub</span>
              <span className="text-center text-emerald-500">Marketplace</span>
            </div>
            {features.map((f) => (
              <div key={f.label} className="grid grid-cols-3 px-4 py-2.5 border-b border-slate-800/50 last:border-0 items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase">{f.label}</span>
                <div className="flex justify-center">
                  {typeof f.hub === "boolean"
                    ? f.hub ? <Check /> : <Cross />
                    : <span className="text-[8px] font-black text-slate-300 text-center">{f.hub}</span>
                  }
                </div>
                <div className="flex justify-center">
                  {typeof f.market === "boolean"
                    ? f.market ? <Check /> : <Cross />
                    : <span className="text-[8px] font-black text-slate-300 text-center">{f.market}</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm border-b-2 border-blue-800 transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
