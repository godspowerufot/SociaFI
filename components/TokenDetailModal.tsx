"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useMarketplace } from "@/lib/contexts/MarketplaceContext";
import { XMarkIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, TagIcon, ChartBarIcon, ArrowTopRightOnSquareIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { useState, useEffect, useCallback } from "react";
import { RpcProvider, CallData, cairo, num } from "starknet";
import { STARKNET_RPC_URL } from "@/lib/constants";
import { Amount, sepoliaTokens, mainnetTokens } from "starkzap";
import { NETWORK } from "@/lib/constants";


// ─── Types ─────────────────────────────────────────────────────────────────────

interface TokenOnChainData {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  buyPrice: string;  // for 1 token
  sellPrice: string; // for 1 token
  postId: string;
  creator: string;
  creatorStrkBalance: string;
  creatorAllowance: string;
}


interface VoyagerTx {
  hash: string;
  type: string;
  timestamp: number;
  status: string;
}

interface TokenDetailModalProps {
  tokenAddress: string;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helper: decode ByteArray from raw felts ───────────────────────────────────

function decodeByteArray(felts: string[], start: number): { value: string; next: number } {
  const dataLen = Number(BigInt(felts[start]));
  let result = "";

  for (let i = 0; i < dataLen; i++) {
    const felt = felts[start + 1 + i];
    const hex = (felt.startsWith("0x") ? felt.slice(2) : felt).padStart(62, "0");
    for (let j = 0; j < 62; j += 2) {
      result += String.fromCharCode(parseInt(hex.slice(j, j + 2), 16));
    }
  }

  const pendingWord = felts[start + 1 + dataLen];
  const pendingWordLen = Number(BigInt(felts[start + 2 + dataLen]));
  if (pendingWordLen > 0) {
    const hex = (pendingWord.startsWith("0x") ? pendingWord.slice(2) : pendingWord).padStart(pendingWordLen * 2, "0");
    for (let j = 0; j < pendingWordLen * 2; j += 2) {
      result += String.fromCharCode(parseInt(hex.slice(j, j + 2), 16));
    }
  }

  return { value: result.replace(/\0/g, "").trim(), next: start + 3 + dataLen };
}

function formatTokenAmount(raw: string, decimals = 18): string {
  try {
    const bigVal = BigInt(raw);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = bigVal / divisor;
    const frac = (bigVal % divisor).toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${frac}`;
  } catch {
    return "0";
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TokenDetailModal({ tokenAddress, isOpen, onClose }: TokenDetailModalProps) {
  const { wallet, currentUser } = useAuth();
  const { listToken } = useMarketplace();

  const [onChainData, setOnChainData] = useState<TokenOnChainData | null>(null);
  const [userBalance, setUserBalance] = useState("0");
  const [userStrkBalance, setUserStrkBalance] = useState("0");
  const [txHistory, setTxHistory] = useState<VoyagerTx[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isTxPending, setIsTxPending] = useState(false);

  const [mode, setMode] = useState<"buy" | "sell" | "list">("buy");
  const [amount, setAmount] = useState("1");
  const [listPrice, setListPrice] = useState("0.05");
  const [autoSavePct, setAutoSavePct] = useState(10);

  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });

  const call = useCallback(async (entrypoint: string, calldata: string[] = [], contract: string = tokenAddress): Promise<string[]> => {
    const result = await provider.callContract({ contractAddress: contract, entrypoint, calldata });
    return Array.isArray(result) ? result : (result as any).result;
  }, [tokenAddress]);


  const fetchOnChainData = useCallback(async () => {
    if (!tokenAddress || !isOpen) return;
    setIsLoading(true);
    try {
      // Parallel reads for speed
      const [nameRes, symbolRes, decRes, supplyRes, postIdRes, creatorRes] = await Promise.all([
        call("name"),
        call("symbol"),
        call("decimals"),
        call("total_supply"),
        call("post_id"),
        call("creator"),
      ]);

      const { value: name } = decodeByteArray(nameRes, 0);
      const { value: symbol } = decodeByteArray(symbolRes, 0);
      const decimals = Number(BigInt(decRes[0]));
      const supplyLow = BigInt(supplyRes[0]);
      const supplyHigh = BigInt(supplyRes[1] ?? "0");
      const totalSupplyRaw = (supplyHigh * 2n ** 128n + supplyLow).toString();
      const postId = BigInt(postIdRes[0]).toString();
      const creator = num.toHex(creatorRes[0]);

      // Get buy/sell price for 1 token
      const oneToken = cairo.uint256((BigInt(10) ** BigInt(decimals)).toString());
      const [buyRes, sellRes] = await Promise.all([
        call("get_buy_price", CallData.compile([oneToken])),
        call("get_sell_price", CallData.compile([oneToken])),
      ]);
      const buyLow = BigInt(buyRes[0]); const buyHigh = BigInt(buyRes[1] ?? "0");
      const sellLow = BigInt(sellRes[0]); const sellHigh = BigInt(sellRes[1] ?? "0");
      const buyPrice = formatTokenAmount((buyHigh * 2n ** 128n + buyLow).toString());
      const sellPrice = formatTokenAmount((sellHigh * 2n ** 128n + sellLow).toString());

      // Get creator balance and allowance for STRK
      const strkAddress = (NETWORK === "sepolia" ? sepoliaTokens : mainnetTokens).STRK.address;
      const [cBalRes, cAllRes] = await Promise.all([
        call("balance_of", CallData.compile([creator]), strkAddress),
        call("allowance", CallData.compile([creator, tokenAddress]), strkAddress)
      ]);
      const cBalLow = BigInt(cBalRes[0]); const cBalHigh = BigInt(cBalRes[1] ?? "0");
      const cAllLow = BigInt(cAllRes[0]); const cAllHigh = BigInt(cAllRes[1] ?? "0");
      const creatorStrkBalance = (cBalHigh * 2n ** 128n + cBalLow).toString();
      const creatorAllowance = (cAllHigh * 2n ** 128n + cAllLow).toString();

      setOnChainData({
        name,
        symbol,
        decimals,
        totalSupply: formatTokenAmount(totalSupplyRaw, decimals),
        buyPrice,
        sellPrice,
        postId,
        creator,
        creatorStrkBalance,
        creatorAllowance
      });

      // Get user balance
      if (currentUser) {
        const [balRes, strkRes] = await Promise.all([
          call("balance_of", CallData.compile([currentUser])),
          call("balance_of", CallData.compile([currentUser]), (NETWORK === "sepolia" ? sepoliaTokens : mainnetTokens).STRK.address)
        ]);
        
        const balLow = BigInt(balRes[0]); const balHigh = BigInt(balRes[1] ?? "0");
        setUserBalance(formatTokenAmount((balHigh * 2n ** 128n + balLow).toString(), decimals));

        const strkLow = BigInt(strkRes[0]); const strkHigh = BigInt(strkRes[1] ?? "0");
        setUserStrkBalance(formatTokenAmount((strkHigh * 2n ** 128n + strkLow).toString(), 18));
      }


      // Fetch recent transactions from Voyager API
      try {
        const txRes = await fetch(`https://api.voyager.online/beta/contracts/${tokenAddress}/txns?ps=10&p=1`, {
          headers: { "accept": "application/json" }
        });
        if (txRes.ok) {
          const txData = await txRes.json();
          const items = txData.items ?? txData.data ?? [];
          setTxHistory(items.slice(0, 8).map((t: any) => ({
            hash: t.hash ?? t.transaction_hash ?? "",
            type: t.type ?? "INVOKE",
            timestamp: t.timestamp ?? 0,
            status: t.status ?? t.finality_status ?? "ACCEPTED",
          })));
        }
      } catch {
        // Voyager API might be rate-limited; tx history is optional
      }
    } catch (err) {
      console.error("Failed to fetch token data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, isOpen, currentUser, call]);

  useEffect(() => {
    if (isOpen) {
      fetchOnChainData();
      setMode("buy");
      setAmount("1");
    }
  }, [isOpen, tokenAddress]);

  if (!isOpen) return null;

  const handleBuy = async () => {
    if (!wallet || !onChainData) return;
    setIsTxPending(true);
    try {
      const tokens = NETWORK === "sepolia" ? sepoliaTokens : mainnetTokens;
      const STRK = tokens.STRK;
      const buyAmountRaw = Amount.parse(amount, onChainData.decimals, onChainData.symbol).toBase();
      const costRes1 = await call("get_buy_price", CallData.compile([cairo.uint256(buyAmountRaw)]));
      const costRaw = BigInt(costRes1[0]) + (BigInt(costRes1[1] || "0") << 128n);

      const tx = await wallet.execute([
        {
          contractAddress: STRK.address,
          entrypoint: "approve",
          calldata: CallData.compile([tokenAddress, cairo.uint256(costRaw)]),
        },
        {
          contractAddress: tokenAddress,
          entrypoint: "buy",
          calldata: CallData.compile([cairo.uint256(buyAmountRaw)]),
        }
      ]);
      await provider.waitForTransaction(tx.transaction_hash || tx.hash);
      await fetchOnChainData();
    } catch (e: any) {
      console.error("Buy failed:", e);
    } finally {
      setIsTxPending(false);
    }
  };

  const handleSell = async () => {
    if (!wallet || !onChainData) return;
    setIsTxPending(true);
    try {
      const sellAmountRaw = Amount.parse(amount, onChainData.decimals, onChainData.symbol).toBase();
      const tx = await wallet.execute([
        {
          contractAddress: tokenAddress,
          entrypoint: "sell",
          calldata: CallData.compile([cairo.uint256(sellAmountRaw)]),
        }
      ]);
      await provider.waitForTransaction(tx.transaction_hash || tx.hash);
      await fetchOnChainData();
    } catch (e: any) {
      console.error("Sell failed:", e);
    } finally {
      setIsTxPending(false);
    }
  };

  const handleList = async () => {
    if (!wallet) return;
    setIsTxPending(true);
    try {
      await listToken(tokenAddress as any, amount, listPrice, autoSavePct);
    } catch (e) {
      console.error("List failed:", e);
    } finally {
      setIsTxPending(false);
    }
  };

  const handleAction = () => {
    if (mode === "buy") return handleBuy();
    if (mode === "sell") return handleSell();
    return handleList();
  };

  const d = onChainData;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="brutalist-card bg-white w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-yellow-400 border-b-3 border-black shrink-0">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-black" />
            <span className="text-xs font-black text-black uppercase tracking-widest">
              {isLoading ? "Loading..." : d?.name ?? "Token"} ({isLoading ? "..." : d?.symbol ?? ""})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://sepolia.voyager.online/contract/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-black text-black hover:bg-black hover:text-yellow-400 px-2 py-1 border-2 border-black transition-colors flex items-center gap-1"
            >
              Voyager <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </a>
            <button onClick={onClose} className="text-black hover:bg-black hover:text-white border-2 border-black p-1 transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row overflow-y-auto flex-1 divide-y-3 md:divide-y-0 md:divide-x-3 divide-black">

          {/* LEFT — Token Info + Tx History */}
          <div className="flex-1 p-5 space-y-5 overflow-y-auto">

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Supply", value: isLoading ? "..." : d?.totalSupply, unit: d?.symbol },
                { label: "Your Balance", value: isLoading ? "..." : userBalance, unit: d?.symbol },
                { label: "Buy Price (1 token)", value: isLoading ? "..." : d?.buyPrice, unit: "STRK" },
                { label: "Sell Price (1 token)", value: isLoading ? "..." : d?.sellPrice, unit: "STRK" },
                { label: "Post ID", value: isLoading ? "..." : d?.postId, unit: "" },
                { label: "Decimals", value: isLoading ? "..." : String(d?.decimals), unit: "" },
              ].map(item => (
                <div key={item.label} className="bg-white border-3 border-black p-3 brutalist-shadow">
                  <p className="text-[9px] font-black uppercase text-black/50 tracking-wider">{item.label}</p>
                  <p className="text-sm font-black text-black truncate">{item.value} <span className="text-[9px] font-black text-black/40">{item.unit}</span></p>
                </div>
              ))}
            </div>

            {/* Creator */}
            {d?.creator && (
              <div className="bg-black p-3 flex items-center justify-between">
                <span className="text-[9px] font-black text-yellow-400 uppercase">Creator</span>
                <a
                  href={`https://sepolia.voyager.online/contract/${d.creator}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-mono text-yellow-400 hover:underline"
                >
                  {d.creator.substring(0, 14)}...{d.creator.slice(-6)}
                </a>
              </div>
            )}

            {/* Transaction History */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-black flex items-center gap-2">
                <ChartBarIcon className="w-3.5 h-3.5" />
                Recent Transactions
              </h4>
              <div className="border-3 border-black divide-y-2 divide-black">
                {isLoading ? (
                  <div className="p-4 text-[9px] text-black/40 font-black uppercase text-center">Fetching from Voyager...</div>
                ) : txHistory.length > 0 ? (
                  txHistory.map(tx => (
                    <a
                      key={tx.hash}
                      href={`https://sepolia.voyager.online/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 hover:bg-yellow-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black bg-black text-yellow-400 px-1 uppercase">{tx.type}</span>
                        <span className="text-[9px] font-mono text-black/50 group-hover:text-black">{tx.hash.substring(0, 12)}...</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-emerald-600 uppercase">{tx.status}</span>
                        <ArrowTopRightOnSquareIcon className="w-3 h-3 text-black/30 group-hover:text-black" />
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="p-4 text-[9px] text-black/40 font-black uppercase text-center">No transactions found or Voyager API unavailable</div>
                )}
              </div>
              <a
                href={`https://sepolia.voyager.online/contract/${tokenAddress}#transactions`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-black text-black hover:underline flex items-center gap-1 justify-end"
              >
                View all on Voyager <ArrowTopRightOnSquareIcon className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* RIGHT — Write Functions */}
          <div className="w-full md:w-72 shrink-0 p-5 space-y-5 bg-white overflow-y-auto">

            {/* Mode Tabs */}
            <div className="flex border-3 border-black overflow-hidden">
              {([["buy", "Buy"], ["sell", "Sell"], ["list", "List"]] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase transition-colors ${
                    mode === m
                      ? m === "buy" ? "bg-emerald-400 text-black" : m === "sell" ? "bg-red-400 text-black" : "bg-cyan-400 text-black"
                      : "bg-white text-black/40 hover:bg-black/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-black uppercase">Amount ({d?.symbol ?? "tokens"})</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border-3 border-black p-3 text-sm font-black focus:outline-none focus:bg-yellow-50"
                />
              </div>

              {mode === "list" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-black uppercase">Price per Token (STRK)</label>
                    <input
                      type="number"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="w-full bg-white border-3 border-black p-3 text-sm font-black focus:outline-none focus:bg-yellow-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-pink-600 uppercase flex justify-between">
                      <span>Auto-Save %</span>
                      <span>{autoSavePct}%</span>
                    </label>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={autoSavePct}
                      onChange={(e) => setAutoSavePct(parseInt(e.target.value))}
                      className="w-full accent-pink-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Price Preview */}
            {mode !== "list" && d && (
              <div className="bg-black p-3 space-y-2">
                <div className="flex justify-between text-[9px] font-black uppercase">
                  <span className="text-white/40">{mode === "buy" ? "Cost" : "You Receive"}</span>
                  <span className={mode === "buy" ? "text-yellow-400" : "text-emerald-400"}>
                    {(() => {
                      try {
                        const price = mode === "buy" ? parseFloat(d.buyPrice) : parseFloat(d.sellPrice);
                        return (price * parseFloat(amount || "1")).toFixed(4);
                      } catch { return "~"; }
                    })()} STRK
                  </span>
                </div>
                <div className="flex justify-between text-[8px] font-black text-white/30 uppercase">
                  <span>STRK balance</span>
                  <span>{userStrkBalance} STRK</span>
                </div>
                <div className="flex justify-between text-[8px] font-black text-white/30 uppercase pt-1 border-t border-white/10">
                  <span>{d.symbol} balance</span>
                  <span>{userBalance} {d.symbol}</span>
                </div>

              </div>
            )}

            {/* Exec Button */}
            {d && (() => {
              const data = d;
              const estimatedValue = (parseFloat(data.sellPrice) * parseFloat(amount || "0"));
              const estimatedCost = (parseFloat(data.buyPrice) * parseFloat(amount || "0"));
              
              const hasInsufficientStrk = mode === "buy" && estimatedCost > parseFloat(userStrkBalance);
              const hasInsufficientToken = mode === "sell" && parseFloat(amount || "0") > parseFloat(userBalance);
              
              // Creator checks for Sell (prevent UI crash with safety checks)
              const creatorBalStr = data.creatorStrkBalance || "0";
              const creatorAllStr = data.creatorAllowance || "0";
              const creatorBal = BigInt(creatorBalStr);
              const creatorAll = BigInt(creatorAllStr);
              
              let sellValueRaw: string;
              try {
                sellValueRaw = Amount.parse(amount || "0", 18, "STRK").toBase();
              } catch {
                sellValueRaw = "0";
              }
              const hasLowLiquidity = mode === "sell" && (creatorBal < BigInt(sellValueRaw) || creatorAll < BigInt(sellValueRaw));


              return (
                <div className="space-y-2">
                  {(hasInsufficientStrk || hasInsufficientToken || hasLowLiquidity) && (
                    <div className="bg-red-50 border-2 border-red-500 p-2 animate-pulse">
                      <p className="text-[9px] font-black text-red-600 uppercase text-center">
                        {hasInsufficientStrk ? "Insufficient STRK balance" 
                          : hasInsufficientToken ? "Insufficient token balance"
                          : "Market Liquidity Low (Creator lacks STRK or approval)"}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleAction}
                    disabled={!wallet || isTxPending || !amount || hasInsufficientStrk || hasInsufficientToken || hasLowLiquidity}

                    className={`w-full py-4 text-[11px] font-black uppercase tracking-widest border-3 border-black brutalist-shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all ${
                      mode === "buy" ? "bg-emerald-400 text-black hover:bg-emerald-300"
                        : mode === "sell" ? "bg-red-400 text-black hover:bg-red-300"
                          : "bg-cyan-400 text-black hover:bg-cyan-300"
                    }`}
                  >
                    {isTxPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        {mode === "buy" ? "Buying..." : mode === "sell" ? "Selling..." : "Listing..."}
                      </span>
                    ) : (
                      `${mode === "buy" ? "Buy" : mode === "sell" ? "Sell" : "List"} ${amount} ${data.symbol}`
                    )}
                  </button>
                </div>
              );
            })()}




            {!wallet && (
              <p className="text-[9px] font-black text-black/40 text-center uppercase">Connect wallet to trade</p>
            )}

            {/* Token Address */}
            <div className="border-3 border-black/20 p-2 bg-black/5">
              <p className="text-[8px] font-black text-black/40 uppercase mb-1">Contract</p>
              <p className="text-[8px] font-mono text-black break-all">{tokenAddress}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
