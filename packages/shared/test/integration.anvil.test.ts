import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createPublicClient, createWalletClient, http, keccak256, toHex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { startAnvil, type AnvilHandle } from "./helpers/anvil.js";
import { deployStack, type DeployedAddresses } from "./helpers/deploy.js";
import { MockUSDC, LiquidityPool, FactoringController, InvoiceRegistry } from "../src/abi.generated.js";
import { underwrite } from "../src/underwrite.js";
import type { UnderwriterLLM } from "../src/llm.js";
import type { InvoiceInput } from "../src/types.js";

// Anvil default accounts (well-known test keys — never used on a real network).
const DEPLOYER = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const UNDERWRITER = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"); // #1
const SMB = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"); // #2
const BUYER = privateKeyToAccount("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"); // #3

const fakeLLM: UnderwriterLLM = {
  price: async () => ({ riskScore: 20, advanceRatioBps: 8000, feeBps: 200, rationale: "clean payer", keyFactors: ["seeded"] }),
};

let anvil: AnvilHandle;
let pub: ReturnType<typeof createPublicClient>;
let addrs: DeployedAddresses;

const ANVIL_CHAIN_ID = 31337;

beforeAll(async () => {
  anvil = await startAnvil(8545);
  pub = createPublicClient({ transport: http(anvil.rpcUrl) });
  const deployerWallet = createWalletClient({ account: DEPLOYER, transport: http(anvil.rpcUrl) });
  addrs = await deployStack(deployerWallet, pub, UNDERWRITER.address);

  // Fund the pool: mint USDC to deployer, approve, deposit 1,000 USDC.
  const mint = await deployerWallet.writeContract({ address: addrs.usdc, abi: MockUSDC.abi as any, functionName: "mint", args: [DEPLOYER.address, 1_000_000_000n], account: DEPLOYER, chain: null });
  await pub.waitForTransactionReceipt({ hash: mint });
  const approve = await deployerWallet.writeContract({ address: addrs.usdc, abi: MockUSDC.abi as any, functionName: "approve", args: [addrs.pool, 1_000_000_000n], account: DEPLOYER, chain: null });
  await pub.waitForTransactionReceipt({ hash: approve });
  const deposit = await deployerWallet.writeContract({ address: addrs.pool, abi: LiquidityPool.abi as any, functionName: "deposit", args: [1_000_000_000n, DEPLOYER.address], account: DEPLOYER, chain: null });
  await pub.waitForTransactionReceipt({ hash: deposit });
}, 60_000);

afterAll(() => anvil?.stop());

describe("anvil round-trip: TS-signed quote accepted on-chain", () => {
  it("requestFinancing accepts the SDK's EIP-712 signature and advances USDC", async () => {
    const block = await pub.getBlock();
    const input: InvoiceInput = {
      smb: SMB.address,
      buyer: BUYER.address,
      faceAmount: 100_000_000n,
      dueDate: block.timestamp + 30n * 86_400n,
      docHash: keccak256(toHex("invoice-001")),
    };
    const { quote, signature, decision } = await underwrite(input, {
      client: pub,
      addrs: { registry: addrs.registry, pool: addrs.pool, controller: addrs.controller },
      chainId: ANVIL_CHAIN_ID,
      llm: fakeLLM,
      signer: UNDERWRITER,
      nonce: 1n,
      nowSec: Number(block.timestamp),
    });
    expect(decision.advanceAmount).toBe(80_000_000n);

    const smbWallet = createWalletClient({ account: SMB, transport: http(anvil.rpcUrl) });
    const hash = await smbWallet.writeContract({
      address: addrs.controller,
      abi: FactoringController.abi as any,
      functionName: "requestFinancing",
      args: [quote, signature],
      account: SMB,
      chain: null,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("success");

    const smbBal = (await pub.readContract({ address: addrs.usdc, abi: MockUSDC.abi as any, functionName: "balanceOf", args: [SMB.address] })) as bigint;
    expect(smbBal).toBe(80_000_000n); // advance received
    const outstanding = (await pub.readContract({ address: addrs.pool, abi: LiquidityPool.abi as any, functionName: "outstandingPrincipal" })) as bigint;
    expect(outstanding).toBe(80_000_000n);
    const owner = (await pub.readContract({ address: addrs.registry, abi: InvoiceRegistry.abi as any, functionName: "ownerOf", args: [1n] })) as Address;
    expect(owner.toLowerCase()).toBe(addrs.pool.toLowerCase());
  });

  it("rejects a tampered quote (signature no longer matches)", async () => {
    const block = await pub.getBlock();
    const input: InvoiceInput = {
      smb: SMB.address, buyer: BUYER.address, faceAmount: 100_000_000n,
      dueDate: block.timestamp + 30n * 86_400n, docHash: keccak256(toHex("invoice-002")),
    };
    const { quote, signature } = await underwrite(input, {
      client: pub,
      addrs: { registry: addrs.registry, pool: addrs.pool, controller: addrs.controller },
      chainId: ANVIL_CHAIN_ID, llm: fakeLLM, signer: UNDERWRITER, nonce: 2n, nowSec: Number(block.timestamp),
    });
    const tampered = { ...quote, advanceAmount: 95_000_000n }; // raise advance after signing
    // simulateContract performs eth_call and throws on revert (InvalidSignature) — deterministic.
    await expect(
      pub.simulateContract({ address: addrs.controller, abi: FactoringController.abi as any, functionName: "requestFinancing", args: [tampered, signature], account: SMB.address }),
    ).rejects.toThrow();
  });
});
