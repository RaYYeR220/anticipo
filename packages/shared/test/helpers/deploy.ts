import type { Address } from "viem";
import { MockUSDC, LiquidityPool, InvoiceRegistry, FactoringController } from "../../src/abi.generated.js";

export interface DeployedAddresses {
  usdc: Address;
  pool: Address;
  registry: Address;
  controller: Address;
}

// `wallet`/`pub` are typed `any` here: viem's concrete client types don't cleanly
// assign to the parameterized WalletClient/PublicClient generics (method variance),
// and this is a test-only helper. ABIs are passed `as any` for the same reason.
async function deployOne(
  wallet: any,
  pub: any,
  artifact: { abi: readonly unknown[]; bytecode: `0x${string}` },
  args: readonly unknown[],
): Promise<Address> {
  const hash = await wallet.deployContract({ abi: artifact.abi as any, bytecode: artifact.bytecode, args: args as any, account: wallet.account!, chain: null });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("deploy: no contractAddress in receipt");
  return receipt.contractAddress;
}

/// Deploys the full stack and wires the controller, mirroring Deploy.s.sol.
export async function deployStack(
  wallet: any,
  pub: any,
  underwriter: Address,
): Promise<DeployedAddresses> {
  const usdc = await deployOne(wallet, pub, MockUSDC, []);
  const pool = await deployOne(wallet, pub, LiquidityPool, [usdc]);
  const registry = await deployOne(wallet, pub, InvoiceRegistry, []);
  const controller = await deployOne(wallet, pub, FactoringController, [usdc, pool, registry, underwriter]);

  const acct = wallet.account!;
  const setPool = await wallet.writeContract({ address: pool, abi: LiquidityPool.abi as any, functionName: "setController", args: [controller], account: acct, chain: null });
  await pub.waitForTransactionReceipt({ hash: setPool });
  const setReg = await wallet.writeContract({ address: registry, abi: InvoiceRegistry.abi as any, functionName: "setController", args: [controller], account: acct, chain: null });
  await pub.waitForTransactionReceipt({ hash: setReg });

  return { usdc, pool, registry, controller };
}
