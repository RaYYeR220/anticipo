// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LiquidityPool} from "../src/LiquidityPool.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";
import {FactoringController} from "../src/FactoringController.sol";

/// @notice Testnet (Arbitrum Sepolia) seeder for the Anticipo demo.
///
/// Unlike the local seeder, testnet EOAs have no pre-funded gas, and multi-broadcaster
/// scripts invite nonce races on a real network. So this script uses a SINGLE broadcaster
/// (the deployer == underwriter, the only key the user funds) for EVERY action:
///   - It deposits liquidity as the LP.
///   - It is the `smb` on each quote, so `requestFinancing` (which requires msg.sender == smb)
///     passes — under `vm.startBroadcast(deployerPk)` the controller sees msg.sender == deployer.
///   - It calls `payInvoice` itself; repayment reputation is credited to the invoice's `buyer`
///     address regardless of who pays, so the buyers never need gas or keys — they are just
///     the named demo addresses the UI already resolves (see apps/web/src/lib/buyers.ts).
///
/// Result on-chain: a clean buyer "Soriana" (3 on-time repayments) and a late-paying buyer
/// "Comercial Mexicana" (1 on-time + 2 late) — exactly the contrast the AI underwriter prices.
///
/// Prereqs: contracts already deployed (Task 1). Provide their addresses + the funded deployer
/// key via env. Run:
///   forge script script/SeedSepolia.s.sol:SeedSepolia \
///     --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast --slow -vv
contract SeedSepolia is Script {
    // Named demo buyers — SAME addresses the local seed + UI use (buyers.ts resolves the names).
    // We never need their private keys: the deployer pays on their behalf and the registry
    // credits the buyer address recorded on the invoice.
    address constant BUYER1 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Soriana (clean)
    address constant BUYER2 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // Comercial Mexicana (late)

    uint256 constant USDC = 1e6; // 6 decimals
    uint256 constant LP_DEPOSIT = 500_000 * USDC;

    MockUSDC usdc;
    LiquidityPool pool;
    InvoiceRegistry registry;
    FactoringController controller;

    uint256 deployerPk; // == underwriter; the universal broadcaster
    address deployer;
    uint256 nonceCounter;

    function run() external {
        deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        deployer = vm.addr(deployerPk);
        usdc = MockUSDC(vm.envAddress("USDC_ADDRESS"));
        pool = LiquidityPool(vm.envAddress("POOL_ADDRESS"));
        registry = InvoiceRegistry(vm.envAddress("REGISTRY_ADDRESS"));
        controller = FactoringController(vm.envAddress("CONTROLLER_ADDRESS"));

        vm.startBroadcast(deployerPk);

        // 1) Liquidity + float: mint USDC to the deployer, approve, deposit as the LP.
        //    1,000,000 minted - 500,000 deposited leaves 500k float to pay invoices with.
        usdc.mint(deployer, 1_000_000 * USDC);
        usdc.approve(address(pool), type(uint256).max);
        usdc.approve(address(controller), type(uint256).max);
        pool.deposit(LP_DEPOSIT, deployer);

        // 2) Clean buyer Soriana: 3 invoices financed -> repaid ON TIME.
        _financeAndRepay(BUYER1, 80_000 * USDC, true);
        _financeAndRepay(BUYER1, 60_000 * USDC, true);
        _financeAndRepay(BUYER1, 90_000 * USDC, true);

        // 3) Late buyer Comercial Mexicana: 1 on-time + 2 LATE -> graded (worse) terms.
        _financeAndRepay(BUYER2, 30_000 * USDC, true);
        _financeAndRepay(BUYER2, 25_000 * USDC, false);
        _financeAndRepay(BUYER2, 20_000 * USDC, false);

        vm.stopBroadcast();

        _report();
    }

    /// @dev Builds + underwriter-signs a quote (smb == deployer so requestFinancing passes),
    /// finances it, then immediately pays it. `onTime` picks a future vs past dueDate, so the
    /// immediate payInvoice is recorded as on-time vs late.
    function _financeAndRepay(address buyer, uint256 face, bool onTime) internal {
        uint256 advance = (face * 85) / 100; // advanceRatioBps = 8500
        uint64 dueDate =
            onTime ? uint64(block.timestamp + 30 days) : uint64(block.timestamp - 2 days);

        FactoringController.Quote memory q = FactoringController.Quote({
            smb: deployer,
            buyer: buyer,
            faceAmount: face,
            dueDate: dueDate,
            advanceRatioBps: 8500,
            feeBps: 150,
            advanceAmount: advance,
            docHash: keccak256(abi.encodePacked("anticipo-seed", nonceCounter)),
            expiry: uint64(block.timestamp + 1 hours),
            nonce: nonceCounter
        });
        nonceCounter++;

        bytes memory sig = _sign(q); // staticcall hashQuote + vm.sign (not broadcast)

        uint256 id = controller.requestFinancing(q, sig); // msg.sender == deployer == q.smb
        controller.payInvoice(id); // deployer pays; reputation credited to `buyer`
    }

    function _sign(FactoringController.Quote memory q) internal view returns (bytes memory) {
        bytes32 digest = controller.hashQuote(q);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(deployerPk, digest); // underwriter == deployer
        return abi.encodePacked(r, s, v);
    }

    function _report() internal view {
        console2.log("=== Anticipo testnet seed complete ===");
        console2.log("USDC:               ", address(usdc));
        console2.log("LiquidityPool:      ", address(pool));
        console2.log("InvoiceRegistry:    ", address(registry));
        console2.log("FactoringController:", address(controller));
        console2.log("Underwriter/deployer:", deployer);
        console2.log("pool.totalAssets:   ", pool.totalAssets());
        console2.log("availableLiquidity: ", pool.availableLiquidity());
        console2.log("registry.nextId:    ", registry.nextId());

        InvoiceRegistry.Reputation memory r1 = registry.getBuyerReputation(BUYER1);
        console2.log("Soriana paidOnTime: ", uint256(r1.paidOnTime));
        console2.log("Soriana volumeRepaid:", r1.totalVolumeRepaid);

        InvoiceRegistry.Reputation memory r2 = registry.getBuyerReputation(BUYER2);
        console2.log("ComMex paidOnTime:  ", uint256(r2.paidOnTime));
        console2.log("ComMex paidLate:    ", uint256(r2.paidLate));
    }
}
