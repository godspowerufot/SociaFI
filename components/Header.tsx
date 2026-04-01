"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useSocial } from "@/lib/contexts/SocialContext";
import { useState, useEffect } from "react";
import ProfileModal from "./ProfileModal";
import WalletConnectionModal from "./WalletConnectionModal";
import { PowerIcon } from "@heroicons/react/24/solid";

export default function Header() {
  const { currentUser, connectWallet, disconnectWallet } = useAuth();
  const { profiles } = useSocial();
  const profile = currentUser ? profiles[currentUser] : null;
  const isRegistered = currentUser ? !!profiles[currentUser] : false;

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalAddress, setProfileModalAddress] = useState<string | null>(null);

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
  };

  // Automatically open Profile Modal if user connects and is not registered
  useEffect(() => {
    if (currentUser && !isRegistered) {
      setProfileModalAddress(currentUser);
      setIsProfileModalOpen(true);
    }
  }, [currentUser, isRegistered]);

  const openOwnProfile = () => {
    if (!currentUser) return;
    setProfileModalAddress(currentUser);
    setIsProfileModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b-4 border-black px-6 py-4 flex items-center justify-between shadow-[0_4px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 border-3 border-black flex items-center justify-center font-black text-black text-xl brutalist-shadow">S</div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-black">Social.Net</h1>
        </div>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={openOwnProfile}
                className="flex items-center gap-3 bg-white border-3 border-black hover:bg-cyan-400 px-4 py-2 transition-all group brutalist-shadow"
              >
                {profile?.avatarCid ? (
                  <img src={profile.avatarCid} alt="" className="w-8 h-8 border-2 border-black bg-white" />
                ) : (
                  <div className="w-8 h-8 bg-yellow-400 border-2 border-black flex items-center justify-center text-xs font-black italic text-black">
                    {(profile?.username || currentUser).substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-black uppercase tracking-widest text-black">
                  {profile?.username || (currentUser ? `${currentUser.substring(0, 6)}...${currentUser.substring(currentUser.length - 4)}` : "Connect")}
                </span>
                {!isRegistered && (
                  <span className="text-[10px] font-black text-white bg-black border-2 border-black px-2 py-0.5 uppercase">
                    UNREGISTERED
                  </span>
                )}
              </button>
              <button
                onClick={() => disconnectWallet()}
                title="Disconnect Wallet"
                className="p-2.5 bg-rose-500 text-white border-3 border-black hover:bg-rose-600 transition-all brutalist-shadow"
              >
                <PowerIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              className="bg-white border-3 border-black px-6 py-2 font-black uppercase tracking-widest hover:bg-yellow-400 transition-all brutalist-shadow"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <ProfileModal
        address={profileModalAddress}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <WalletConnectionModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
}
