import { NextRequest, NextResponse } from "next/server";

// ZAN public Sepolia RPC - reliable and CORS-free from server side
const RPC_URL = "https://api.zan.top/public/starknet-sepolia/rpc/v0_9";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[RPC Proxy] Error:", error.message);
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32603, message: error.message }, id: null },
      { status: 500 }
    );
  }
}
