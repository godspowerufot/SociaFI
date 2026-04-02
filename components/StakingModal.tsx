"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actionLabel: string;
  onAction: (amount: string) => Promise<void>;
  isLoading: boolean;
}

export default function StakingModal({
  isOpen,
  onClose,
  title,
  actionLabel,
  onAction,
  isLoading
}: StakingModalProps) {
  const [amount, setAmount] = useState("10");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="brutalist-card bg-white w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 border-2 border-black"
        >
          <XMarkIcon className="w-5 h-5 text-black" />
        </button>

        <h3 className="text-xl font-black uppercase mb-6 tracking-tight bg-yellow-400 w-fit px-2 border-2 border-black inline-block italic">
          // {title}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-black uppercase mb-2">Amount (STRK)</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white border-3 border-black p-4 text-sm font-black focus:outline-none focus:bg-yellow-50"
              placeholder="0.00"
            />
          </div>

          <button
            onClick={async () => {
              await onAction(amount);
              onClose();
            }}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className="btn-brutal w-full py-4 text-base flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>{isLoading ? "Processing..." : actionLabel}</span>
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-black uppercase text-gray-500 hover:text-black transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
