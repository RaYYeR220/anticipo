import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { OpenRouterLLM } from "@anticipo/shared";
import { runUnderwrite, type UnderwriteRequest } from "@/server/underwriterService";

export const runtime = "nodejs"; // needs node crypto + env secrets, not edge

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UnderwriteRequest;
    if (!body?.smb || !body?.buyer || !body?.faceAmount || !body?.dueDateSec) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    const pk = process.env.UNDERWRITER_PRIVATE_KEY as `0x${string}` | undefined;
    if (!pk) return NextResponse.json({ error: "server not configured" }, { status: 500 });

    const client = createPublicClient({ transport: http(process.env.RPC_URL) });
    const result = await runUnderwrite(body, {
      client,
      chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
      addresses: {
        registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as Address,
        pool: process.env.NEXT_PUBLIC_POOL_ADDRESS as Address,
        controller: process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS as Address,
      },
      signer: privateKeyToAccount(pk),
      llm: new OpenRouterLLM(),
    });
    return NextResponse.json(result.toJSON());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "underwrite failed" }, { status: 500 });
  }
}
