import { spawn, type ChildProcess } from "node:child_process";
import { createPublicClient, http } from "viem";

export interface AnvilHandle {
  rpcUrl: string;
  stop: () => void;
}

/// Spawns a local anvil node and waits until it answers eth_blockNumber.
export async function startAnvil(port = 8545): Promise<AnvilHandle> {
  const proc: ChildProcess = spawn("anvil", ["--port", String(port), "--silent"], {
    stdio: "ignore",
    shell: process.platform === "win32", // resolve anvil.cmd/exe on Windows PATH
  });
  const rpcUrl = `http://127.0.0.1:${port}`;
  const client = createPublicClient({ transport: http(rpcUrl) });

  const deadline = Date.now() + 20_000;
  for (;;) {
    try {
      await client.getBlockNumber();
      break;
    } catch {
      if (Date.now() > deadline) {
        proc.kill();
        throw new Error("anvil did not start within 20s");
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return { rpcUrl, stop: () => proc.kill() };
}
