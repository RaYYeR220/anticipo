// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LiquidityPool} from "../src/LiquidityPool.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";
import {FactoringController} from "../src/FactoringController.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FactoringControllerTest is Test {
    MockUSDC usdc;
    LiquidityPool pool;
    InvoiceRegistry reg;
    FactoringController ctrl;

    uint256 underwriterPk = 0xA11CE;
    address underwriter;
    address lp = address(0x11);
    address smb = address(0x22);
    address buyer = address(0x33);

    function setUp() public {
        underwriter = vm.addr(underwriterPk);

        usdc = new MockUSDC();
        pool = new LiquidityPool(IERC20(address(usdc)));
        reg = new InvoiceRegistry();
        ctrl = new FactoringController(IERC20(address(usdc)), pool, reg, underwriter);

        pool.setController(address(ctrl));
        reg.setController(address(ctrl));

        // seed pool with 1,000 USDC
        usdc.mint(lp, 1_000_000_000);
        vm.startPrank(lp);
        usdc.approve(address(pool), type(uint256).max);
        pool.deposit(1_000_000_000, lp);
        vm.stopPrank();

        // buyer can pay
        usdc.mint(buyer, 1_000_000_000);
        vm.prank(buyer);
        usdc.approve(address(ctrl), type(uint256).max);
    }

    function _quote() internal view returns (FactoringController.Quote memory q) {
        q = FactoringController.Quote({
            smb: smb,
            buyer: buyer,
            faceAmount: 100_000_000,            // 100 USDC
            dueDate: uint64(block.timestamp + 30 days),
            advanceRatioBps: 8000,              // 80%
            feeBps: 200,                        // 2% of face = 2 USDC
            advanceAmount: 80_000_000,          // 80 USDC
            docHash: keccak256("invoice-001"),
            expiry: uint64(block.timestamp + 1 hours),
            nonce: 1
        });
    }

    function _sign(FactoringController.Quote memory q) internal view returns (bytes memory) {
        bytes32 digest = ctrl.hashQuote(q);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(underwriterPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_requestFinancingHappyPath() public {
        FactoringController.Quote memory q = _quote();
        bytes memory sig = _sign(q);

        vm.prank(smb);
        uint256 id = ctrl.requestFinancing(q, sig);

        assertEq(usdc.balanceOf(smb), 80_000_000);          // advance received
        assertEq(reg.ownerOf(id), address(pool));            // receivable held by pool
        assertEq(pool.outstandingPrincipal(), 80_000_000);
        assertTrue(ctrl.usedNonce(1));
    }

    function test_rejectsBadSignature() public {
        FactoringController.Quote memory q = _quote();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(uint256(0xBEEF), ctrl.hashQuote(q));
        vm.prank(smb);
        vm.expectRevert(FactoringController.InvalidSignature.selector);
        ctrl.requestFinancing(q, abi.encodePacked(r, s, v));
    }

    function test_rejectsExpiredQuote() public {
        FactoringController.Quote memory q = _quote();
        bytes memory sig = _sign(q);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(smb);
        vm.expectRevert(FactoringController.QuoteExpired.selector);
        ctrl.requestFinancing(q, sig);
    }

    function test_rejectsReusedNonce() public {
        FactoringController.Quote memory q = _quote();
        bytes memory sig = _sign(q);
        vm.prank(smb);
        ctrl.requestFinancing(q, sig);
        vm.prank(smb);
        vm.expectRevert(FactoringController.NonceUsed.selector);
        ctrl.requestFinancing(q, sig);
    }

    function test_rejectsNonSmbCaller() public {
        FactoringController.Quote memory q = _quote();
        bytes memory sig = _sign(q);
        vm.prank(buyer);
        vm.expectRevert(FactoringController.NotSmb.selector);
        ctrl.requestFinancing(q, sig);
    }

    function test_rejectsOutOfBoundTerms() public {
        FactoringController.Quote memory q = _quote();
        q.advanceRatioBps = 9600; // > MAX_ADVANCE_RATIO_BPS
        bytes memory sig = _sign(q);
        vm.prank(smb);
        vm.expectRevert(FactoringController.BadTerms.selector);
        ctrl.requestFinancing(q, sig);
    }

    function test_payInvoiceSettlesAndDistributes() public {
        FactoringController.Quote memory q = _quote();
        bytes memory sig = _sign(q);
        vm.prank(smb);
        uint256 id = ctrl.requestFinancing(q, sig);

        uint256 smbBefore = usdc.balanceOf(smb); // 80 USDC advance
        vm.prank(buyer);
        ctrl.payInvoice(id);

        // face 100 = principal 80 + fee 2 + remainder 18
        assertEq(usdc.balanceOf(smb), smbBefore + 18_000_000);
        assertEq(pool.outstandingPrincipal(), 0);
        assertEq(pool.totalAssets(), 1_002_000_000); // +2 USDC fee yield
        assertEq(uint8(reg.getInvoice(id).status), uint8(InvoiceRegistry.Status.Repaid));
        assertEq(reg.getBuyerReputation(buyer).paidOnTime, 1);
    }

    function test_markDefaultedTooEarlyReverts() public {
        FactoringController.Quote memory q = _quote();
        bytes memory sig = _sign(q);
        vm.prank(smb);
        uint256 id = ctrl.requestFinancing(q, sig);
        vm.expectRevert(FactoringController.TooEarlyToDefault.selector);
        ctrl.markDefaulted(id);
    }

    function test_markDefaultedAfterGraceRealizesLoss() public {
        FactoringController.Quote memory q = _quote();
        bytes memory sig = _sign(q);
        vm.prank(smb);
        uint256 id = ctrl.requestFinancing(q, sig);

        vm.warp(q.dueDate + 7 days + 1);
        ctrl.markDefaulted(id);

        assertEq(pool.outstandingPrincipal(), 0);
        assertEq(pool.totalAssets(), 920_000_000); // 1000 - 80 lost
        assertEq(uint8(reg.getInvoice(id).status), uint8(InvoiceRegistry.Status.Defaulted));
        assertEq(reg.getBuyerReputation(buyer).defaulted, 1);
    }
}
