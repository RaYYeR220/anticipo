// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LiquidityPool} from "../src/LiquidityPool.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";
import {FactoringController} from "../src/FactoringController.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// End-to-end: two LPs, one repaid invoice (yield) and one defaulted invoice (loss),
/// asserting LP share value rises then falls correctly.
contract IntegrationTest is Test {
    MockUSDC usdc;
    LiquidityPool pool;
    InvoiceRegistry reg;
    FactoringController ctrl;

    uint256 uwPk = 0xBEEF;
    address uw;
    address lp = address(0x11);
    address smb = address(0x22);
    address goodBuyer = address(0x33);
    address badBuyer = address(0x44);

    function setUp() public {
        uw = vm.addr(uwPk);
        usdc = new MockUSDC();
        pool = new LiquidityPool(IERC20(address(usdc)));
        reg = new InvoiceRegistry();
        ctrl = new FactoringController(IERC20(address(usdc)), pool, reg, uw);
        pool.setController(address(ctrl));
        reg.setController(address(ctrl));

        usdc.mint(lp, 1_000_000_000);
        vm.startPrank(lp);
        usdc.approve(address(pool), type(uint256).max);
        pool.deposit(1_000_000_000, lp);
        vm.stopPrank();

        usdc.mint(goodBuyer, 1_000_000_000);
        vm.prank(goodBuyer);
        usdc.approve(address(ctrl), type(uint256).max);
    }

    function _finance(address buyer, uint16 ratioBps, uint16 feeBps, uint256 advance, uint256 nonce)
        internal
        returns (uint256 id)
    {
        FactoringController.Quote memory q = FactoringController.Quote({
            smb: smb, buyer: buyer, faceAmount: 100_000_000,
            dueDate: uint64(block.timestamp + 30 days),
            advanceRatioBps: ratioBps, feeBps: feeBps, advanceAmount: advance,
            docHash: keccak256(abi.encodePacked(nonce)),
            expiry: uint64(block.timestamp + 1 hours), nonce: nonce
        });
        bytes32 digest = ctrl.hashQuote(q);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(uwPk, digest);
        vm.prank(smb);
        id = ctrl.requestFinancing(q, abi.encodePacked(r, s, v));
    }

    function test_repaidThenDefaultedSharePriceTrajectory() public {
        uint256 shares = pool.balanceOf(lp);
        assertEq(pool.convertToAssets(shares), 1_000_000_000);

        // Good buyer: 80% advance, 3% fee, repays on time -> +3 USDC yield
        uint256 id1 = _finance(goodBuyer, 8000, 300, 80_000_000, 1);
        vm.prank(goodBuyer);
        ctrl.payInvoice(id1);
        // OZ ERC-4626 uses virtual shares: convertToAssets = shares*(totalAssets+1)/(totalSupply+1)
        // = 1e9*(1_003_000_000+1)/(1e9+1) = 1_002_999_999 (floor)
        assertEq(pool.convertToAssets(shares), 1_002_999_999);

        // Bad buyer: 70% advance, defaults -> -70 USDC loss
        uint256 id2 = _finance(badBuyer, 7000, 600, 70_000_000, 2);
        vm.warp(block.timestamp + 31 days + 7 days + 1);
        ctrl.markDefaulted(id2);
        assertEq(pool.convertToAssets(shares), 933_000_000); // 1003 - 70

        // LP can still withdraw remaining value
        vm.prank(lp);
        uint256 assetsOut = pool.redeem(shares, lp, lp);
        assertEq(assetsOut, 933_000_000);
    }
}
