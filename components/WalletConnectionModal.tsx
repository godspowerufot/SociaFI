"use client";

import React, { useContext, useState } from "react";
import { ChainDataContext } from "../lib/contexts/ChainDataContext";
import { XMarkIcon, CheckCircleIcon, LinkIcon } from "@heroicons/react/24/solid";
import { connectWallet as connectCartridgeWallet } from "../lib/starkzap";
import { useWallet } from "@/store/useWallet";

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const chainData = useContext(ChainDataContext);
  const starknetChain = chainData.STARKNET;
  const connectedAddress = starknetChain?.wallet?.address || null;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnectingCartridge, setIsConnectingCartridge] = useState(false);
  const { setStarknetAddress } = useWallet();

  const handleCartridgeConnect = async () => {
    setIsConnectingCartridge(true);
    try {
      const wallet = await connectCartridgeWallet();
      if (wallet) {
        setStarknetAddress(wallet.address, "Cartridge", wallet, null);
        onClose();
      }
    } catch (error) {
      console.error("Cartridge connection failed:", error);
    } finally {
      setIsConnectingCartridge(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (!starknetChain?.connect) {
        throw new Error("No Starknet wallet provider found");
      }
      await starknetChain.connect();
      onClose();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      if (starknetChain?.disconnect) {
        await starknetChain.disconnect();
      }
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    } finally {
      setIsDisconnecting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-white/40 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative bg-white border-4 border-black brutalist-shadow max-w-md w-full overflow-hidden slide-in-from-bottom-8 animate-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-black bg-yellow-400">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-black italic">
            // CONNECT IDENTITY
          </h2>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black hover:bg-black hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="p-6 border-3 border-black bg-white brutalist-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-400 border-2 border-black flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/40">Network</p>
                <p className="text-sm font-black uppercase text-black">Starknet Sepolia</p>
              </div>
            </div>

            {connectedAddress ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-xs italic">
                  <CheckCircleIcon className="w-4 h-4" />
                  Synced to Mesh
                </div>
                <div className="text-[10px] font-black break-all bg-black text-white p-3 border-2 border-black uppercase tracking-tighter">
                  {connectedAddress}
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="w-full bg-red-500 text-white border-3 border-black p-3 font-black uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 transition-transform disabled:opacity-50 brutalist-shadow"
                >
                  {isDisconnecting ? "DETACHING..." : "DETACH WALLET"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || isConnectingCartridge}
                  className="w-full bg-cyan-400 text-black border-3 border-black p-4 font-black uppercase tracking-[0.2em] hover:bg-yellow-400 transition-colors disabled:opacity-50 brutalist-shadow"
                >
                  {isConnecting ? "CONNECTING..." : "INITIALIZE SYNC (EXTENSION)"}
                </button>
                <button
                  onClick={handleCartridgeConnect}
                  disabled={isConnecting || isConnectingCartridge}
                  className="w-full bg-yellow-400 text-black border-3 border-black p-4 font-black uppercase tracking-[0.2em] hover:bg-cyan-400 transition-colors disabled:opacity-50 brutalist-shadow"
                >
                  {isConnectingCartridge ? "CONNECTING..." : "CONNECT WITH CARTRIDGE"}
                </button>
              </div>
            )}
          </div>

          <div className="text-[10px] font-black text-black/60 uppercase tracking-widest leading-relaxed p-4 border-l-4 border-yellow-400 bg-yellow-400/10">
            {connectedAddress
              ? "Your wallet is currently mapped to the protocol. You can now mint content tokens and participate in the mesh."
              : "Connect your Starknet wallet to authorize mesh interactions and manage your digital assets."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionModal;
