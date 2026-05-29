// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";

contract InvoiceRegistryTest is Test {
    InvoiceRegistry reg;
    address controller = address(0xC0);
    address pool = address(0x9001);
    address smb = address(0x22);
    address buyer = address(0x33);

    function setUp() public {
        reg = new InvoiceRegistry();
        reg.setController(controller);
    }

    function _mint() internal returns (uint256 id) {
        vm.prank(controller);
        id = reg.mintInvoice(pool, smb, buyer, 100_000_000, uint64(block.timestamp + 30 days), 8000, 200, 80_000_000, bytes32("doc"));
    }

    function test_onlyControllerCanMint() public {
        vm.expectRevert(InvoiceRegistry.NotController.selector);
        reg.mintInvoice(pool, smb, buyer, 1, 0, 0, 0, 0, bytes32(0));
    }

    function test_mintStoresInvoiceAndOwnership() public {
        uint256 id = _mint();
        assertEq(reg.ownerOf(id), pool);
        InvoiceRegistry.Invoice memory inv = reg.getInvoice(id);
        assertEq(inv.smb, smb);
        assertEq(inv.buyer, buyer);
        assertEq(inv.faceAmount, 100_000_000);
        assertEq(inv.advanceAmount, 80_000_000);
        assertEq(uint8(inv.status), uint8(InvoiceRegistry.Status.Financed));
        assertEq(reg.getBuyerReputation(buyer).firstSeen, block.timestamp);
    }

    function test_markRepaidOnTimeUpdatesReputation() public {
        uint256 id = _mint();
        vm.prank(controller);
        reg.markRepaid(id, true);
        InvoiceRegistry.Reputation memory rep = reg.getBuyerReputation(buyer);
        assertEq(rep.paidOnTime, 1);
        assertEq(rep.paidLate, 0);
        assertEq(rep.totalVolumeRepaid, 100_000_000);
        assertEq(uint8(reg.getInvoice(id).status), uint8(InvoiceRegistry.Status.Repaid));
    }

    function test_markRepaidLateUpdatesReputation() public {
        uint256 id = _mint();
        vm.prank(controller);
        reg.markRepaid(id, false);
        assertEq(reg.getBuyerReputation(buyer).paidLate, 1);
    }

    function test_markDefaultedUpdatesReputation() public {
        uint256 id = _mint();
        vm.prank(controller);
        reg.markDefaulted(id);
        assertEq(reg.getBuyerReputation(buyer).defaulted, 1);
        assertEq(uint8(reg.getInvoice(id).status), uint8(InvoiceRegistry.Status.Defaulted));
    }

    function test_idsIncrement() public {
        uint256 a = _mint();
        uint256 b = _mint();
        assertEq(b, a + 1);
    }

    function test_cannotRepaidTwice() public {
        uint256 id = _mint();
        vm.prank(controller);
        reg.markRepaid(id, true);
        vm.prank(controller);
        vm.expectRevert(abi.encodeWithSelector(InvoiceRegistry.InvalidStatus.selector, id, InvoiceRegistry.Status.Repaid));
        reg.markRepaid(id, true);
    }

    function test_cannotDefaultAfterRepaid() public {
        uint256 id = _mint();
        vm.prank(controller);
        reg.markRepaid(id, true);
        vm.prank(controller);
        vm.expectRevert(abi.encodeWithSelector(InvoiceRegistry.InvalidStatus.selector, id, InvoiceRegistry.Status.Repaid));
        reg.markDefaulted(id);
    }

    function test_cannotMarkNonexistentInvoice() public {
        vm.prank(controller);
        vm.expectRevert(abi.encodeWithSelector(InvoiceRegistry.InvalidStatus.selector, uint256(999), InvoiceRegistry.Status.None));
        reg.markRepaid(999, true);
    }
}
