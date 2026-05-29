// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LiquidityPool} from "../src/LiquidityPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LiquidityPoolTest is Test {
    MockUSDC usdc;
    LiquidityPool pool;

    address owner = address(this);
    address controller = address(0xC0);
    address lp = address(0x11);
    address smb = address(0x22);

    function setUp() public {
        usdc = new MockUSDC();
        pool = new LiquidityPool(IERC20(address(usdc)));
        pool.setController(controller);

        usdc.mint(lp, 1_000_000_000); // 1,000 USDC
        vm.prank(lp);
        usdc.approve(address(pool), type(uint256).max);
    }

    function _deposit(uint256 amount) internal {
        vm.prank(lp);
        pool.deposit(amount, lp);
    }

    function test_decimalsMatchAsset() public view {
        assertEq(pool.decimals(), 6);
    }

    function test_depositMintsSharesAndCountsAssets() public {
        _deposit(100_000_000); // 100 USDC
        assertEq(pool.totalAssets(), 100_000_000);
        assertGt(pool.balanceOf(lp), 0);
        assertEq(pool.availableLiquidity(), 100_000_000);
    }

    function test_onlyControllerCanAdvance() public {
        _deposit(100_000_000);
        vm.expectRevert(LiquidityPool.NotController.selector);
        pool.advance(smb, 50_000_000);
    }

    function test_advanceMovesValueToOutstanding() public {
        _deposit(100_000_000);
        vm.prank(controller);
        pool.advance(smb, 80_000_000);

        assertEq(usdc.balanceOf(smb), 80_000_000);
        assertEq(pool.availableLiquidity(), 20_000_000);
        assertEq(pool.outstandingPrincipal(), 80_000_000);
        // totalAssets unchanged: cash moved into a receivable
        assertEq(pool.totalAssets(), 100_000_000);
    }

    function test_advanceRevertsOnInsufficientLiquidity() public {
        _deposit(100_000_000);
        vm.prank(controller);
        vm.expectRevert(LiquidityPool.InsufficientLiquidity.selector);
        pool.advance(smb, 200_000_000);
    }

    function test_repaymentWithFeeRaisesSharePrice() public {
        _deposit(100_000_000);
        uint256 sharesBefore = pool.balanceOf(lp);
        uint256 assetsPerShareBefore = pool.convertToAssets(sharesBefore);

        vm.prank(controller);
        pool.advance(smb, 80_000_000); // principal out

        // buyer repays principal + 4 USDC fee straight into the pool
        usdc.mint(address(pool), 84_000_000);
        vm.prank(controller);
        pool.notifyRepayment(80_000_000);

        assertEq(pool.outstandingPrincipal(), 0);
        assertEq(pool.totalAssets(), 104_000_000); // 100 + 4 fee
        assertGt(pool.convertToAssets(sharesBefore), assetsPerShareBefore);
    }

    function test_realizeLossDropsSharePrice() public {
        _deposit(100_000_000);
        uint256 shares = pool.balanceOf(lp);

        vm.prank(controller);
        pool.advance(smb, 80_000_000);

        vm.prank(controller);
        pool.realizeLoss(80_000_000); // buyer defaulted, principal written off

        assertEq(pool.outstandingPrincipal(), 0);
        assertEq(pool.totalAssets(), 20_000_000); // only idle cash remains
        assertLt(pool.convertToAssets(shares), 100_000_000);
    }
}
