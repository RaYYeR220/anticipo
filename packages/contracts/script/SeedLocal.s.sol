// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LiquidityPool} from "../src/LiquidityPool.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";
import {FactoringController} from "../src/FactoringController.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice One-shot local seeder for the Anticipo demo.
///
/// Deploys the 4 contracts from anvil acct0 (deployer == underwriter), funds the pool
/// from acct1 (LP), then seeds realistic on-chain history:
///   - Clean buyer "Soriana" (acct2): 6 invoices financed then repaid ON TIME.
///   - Risky buyer "Comercial Mexicana" (acct3): 4 invoices, 1 on-time + 3 LATE (graded risk).
/// Historical SMB is acct5 (requests financing + receives advances).
///
/// Run against a live anvil:
///   forge script script/SeedLocal.s.sol:SeedLocal --broadcast \
///     --rpc-url http://127.0.0.1:8545 -vv
contract SeedLocal is Script {
    // Deterministic anvil accounts.
    uint256 constant DEPLOYER_PK = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // acct0
    uint256 constant LP_PK       = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d; // acct1
    uint256 constant BUYER1_PK   = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a; // acct2 (Soriana)
    uint256 constant BUYER2_PK   = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6; // acct3 (Comercial Mexicana)
    uint256 constant SMB_PK      = 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba; // acct5 (historical SMB)

    address constant DEPLOYER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // acct0 / underwriter
    address constant LP       = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // acct1
    address constant BUYER1   = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // acct2
    address constant BUYER2   = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // acct3
    address constant SMB      = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc; // acct5

    uint256 constant USDC = 1e6; // 6 decimals

    MockUSDC usdc;
    LiquidityPool pool;
    InvoiceRegistry registry;
    FactoringController controller;

    uint256 nonceCounter;

    function run() external {
        // 1) Deploy + wire (acct0 = deployer = underwriter).
        vm.startBroadcast(DEPLOYER_PK);
        usdc = new MockUSDC();
        pool = new LiquidityPool(IERC20(address(usdc)));
        registry = new InvoiceRegistry();
        controller = new FactoringController(IERC20(address(usdc)), pool, registry, DEPLOYER);
        pool.setController(address(controller));
        registry.setController(address(controller));
        vm.stopBroadcast();

        // 2) Seed liquidity: LP (acct1) deposits 500,000 USDC into the pool.
        vm.startBroadcast(LP_PK);
        usdc.mint(LP, 500_000 * USDC);
        usdc.approve(address(pool), type(uint256).max);
        pool.deposit(500_000 * USDC, LP);
        vm.stopBroadcast();

        // 3) Clean buyer Soriana (acct2): 6 invoices, financed -> repaid ON TIME.
        uint256[6] memory faces = [
            uint256(80_000),
            uint256(60_000),
            uint256(90_000),
            uint256(50_000),
            uint256(70_000),
            uint256(70_000)
        ];
        for (uint256 i = 0; i < faces.length; i++) {
            uint256 face = faces[i] * USDC;
            uint256 advance = (face * 85) / 100; // advanceRatioBps = 8500
            _financeAndRepay(BUYER1, BUYER1_PK, face, advance);
        }

        // 4) Risky buyer Comercial Mexicana (acct3): pays, but mostly LATE -> graded (worse) terms.
        uint256[4] memory rfaces = [uint256(30_000), uint256(25_000), uint256(20_000), uint256(45_000)];
        _financeAndRepay(BUYER2, BUYER2_PK, rfaces[0] * USDC, (rfaces[0] * USDC * 85) / 100); // 1 on-time
        for (uint256 j = 1; j < rfaces.length; j++) {
            uint256 f = rfaces[j] * USDC;
            _financeAndRepayLate(BUYER2, BUYER2_PK, f, (f * 85) / 100); // 3 late
        }

        // 5) Demo liquidity: give buyers USDC to settle invoices live; leave LP some extra.
        vm.startBroadcast(DEPLOYER_PK);
        usdc.mint(BUYER1, 50_000 * USDC);
        usdc.mint(BUYER2, 50_000 * USDC);
        usdc.mint(LP, 50_000 * USDC);
        vm.stopBroadcast();

        _report();
    }

    /// @dev Builds + signs a clean (future-dated) quote, finances it as the SMB,
    /// then mints face to the buyer and has the buyer pay it ON TIME.
    function _financeAndRepay(address buyer, uint256 buyerPk, uint256 face, uint256 advance) internal {
        FactoringController.Quote memory q = FactoringController.Quote({
            smb: SMB,
            buyer: buyer,
            faceAmount: face,
            dueDate: uint64(block.timestamp + 30 days), // future -> on-time repayment
            advanceRatioBps: 8500,
            feeBps: 150,
            advanceAmount: advance,
            docHash: keccak256(abi.encodePacked("anticipo-clean", nonceCounter)),
            expiry: uint64(block.timestamp + 1 hours),
            nonce: nonceCounter
        });
        nonceCounter++;

        bytes memory sig = _sign(q);

        // SMB (acct5) requests financing and receives the advance.
        vm.broadcast(SMB_PK);
        uint256 id = controller.requestFinancing(q, sig);

        // Buyer is funded with the full face amount, then pays the invoice on time.
        vm.broadcast(DEPLOYER_PK);
        usdc.mint(buyer, face);

        vm.startBroadcast(buyerPk);
        usdc.approve(address(controller), face);
        controller.payInvoice(id);
        vm.stopBroadcast();
    }

    /// @dev Finances a past-DUE invoice (dueDate in the past) and has the buyer pay it,
    /// which the contract records as a LATE repayment (paidLate++). Builds a "pays but
    /// often late" history so the AI still finances, at worse terms.
    function _financeAndRepayLate(address buyer, uint256 buyerPk, uint256 face, uint256 advance) internal {
        FactoringController.Quote memory q = FactoringController.Quote({
            smb: SMB,
            buyer: buyer,
            faceAmount: face,
            dueDate: uint64(block.timestamp - 2 days), // past dueDate -> payInvoice marks it late
            advanceRatioBps: 8500,
            feeBps: 150,
            advanceAmount: advance,
            docHash: keccak256(abi.encodePacked("anticipo-late", nonceCounter)),
            expiry: uint64(block.timestamp + 1 hours),
            nonce: nonceCounter
        });
        nonceCounter++;

        bytes memory sig = _sign(q);

        vm.broadcast(SMB_PK);
        uint256 id = controller.requestFinancing(q, sig);

        vm.broadcast(DEPLOYER_PK);
        usdc.mint(buyer, face);

        vm.startBroadcast(buyerPk);
        usdc.approve(address(controller), face);
        controller.payInvoice(id);
        vm.stopBroadcast();
    }

    function _sign(FactoringController.Quote memory q) internal view returns (bytes memory) {
        bytes32 digest = controller.hashQuote(q);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(DEPLOYER_PK, digest); // underwriter == acct0
        return abi.encodePacked(r, s, v);
    }

    function _report() internal view {
        console2.log("=== Anticipo seed complete ===");
        console2.log("MockUSDC:           ", address(usdc));
        console2.log("LiquidityPool:      ", address(pool));
        console2.log("InvoiceRegistry:    ", address(registry));
        console2.log("FactoringController:", address(controller));
        console2.log("Underwriter:        ", DEPLOYER);
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
