# Anticipo — Phase 1 (Contracts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and unit-test the full on-chain protocol for Anticipo (ERC-4626 liquidity pool, ERC-721 invoice receivable, EIP-712 AI-underwriter attestation, escrow/settlement, non-recourse default) in Foundry, plus a deploy script, ready for Arbitrum Sepolia.

**Architecture:** Four contracts. `MockUSDC` (6-decimal test stablecoin). `LiquidityPool` (ERC-4626 vault; LPs deposit USDC, fees raise share price, defaults lower it). `InvoiceRegistry` (ERC-721; one NFT per financed invoice + per-buyer reputation counters). `FactoringController` (verifies an EIP-712 `Quote` signed by the registered underwriter, mints the receivable, advances USDC, settles on buyer payment, writes off defaults). Pool and registry trust only the controller; the controller trusts only the underwriter's signature.

**Tech Stack:** Solidity 0.8.24, Foundry (forge 1.7.1), OpenZeppelin Contracts v5.1.0. pnpm monorepo (`packages/contracts`). Target chain: Arbitrum Sepolia.

---

## Phased Roadmap (spec → phases)

This plan is **Phase 1 of 4**. Each phase produces working, testable software and gets its own detailed plan written after the prior phase is green.

| Phase | Scope | Spec sections covered |
|---|---|---|
| **1 (this plan)** | Foundry monorepo scaffold + 4 contracts + unit/integration tests + deploy script | §4 decisions 1,2,3,5,6,8; §5 (all on-chain components); §9 on-chain data flow; §10 on-chain mechanics |
| 2 | `packages/shared` (ABIs, addresses, EIP-712 domain/types) + AI underwriter (`/api/underwrite`: on-chain feature extraction via viem → Gemini structured output → EIP-712 signing) + underwriter guardrails | §4 decision 7; §6; §11/§12 AI parts |
| 3 | `apps/web` Next.js frontend (SMB / LP / Buyer views) + Privy account abstraction + Pimlico sponsored gas | §4 decision 4; §7; §8 web |
| 4 | Buyer-profile seeder + live deploy to Arbitrum Sepolia + Vercel + README honesty section + demo video | §6 seeder; §10 demo data; §11 honesty |

**Why contracts first:** every later phase depends on the deployed addresses and generated ABIs. Phase 2's signing must match `FactoringController`'s EIP-712 domain and `Quote` typehash exactly; building contracts first locks that interface.

---

## File Structure (Phase 1)

```
package.json                              # root pnpm workspace (private)
pnpm-workspace.yaml                       # declares packages/* and apps/*
packages/contracts/
  foundry.toml                            # solc 0.8.24, OZ remapping, rpc/etherscan
  .env.example                            # RPC URL, deployer key, underwriter addr, arbiscan key
  lib/openzeppelin-contracts/             # forge install (submodule)
  src/
    MockUSDC.sol                          # ERC20, 6 decimals, open mint
    LiquidityPool.sol                     # ERC4626 vault, controller-gated advance/repay/loss
    InvoiceRegistry.sol                   # ERC721 receivable + buyer reputation
    FactoringController.sol               # EIP-712 verify + finance/settle/default
  test/
    LiquidityPool.t.sol
    InvoiceRegistry.t.sol
    FactoringController.t.sol
    Integration.t.sol                     # full lifecycle (finance→pay→repaid; default)
  script/
    Deploy.s.sol                          # deploy + wire all four contracts
```

Each contract has one responsibility. Pool = liquidity accounting. Registry = invoice state + reputation. Controller = policy/orchestration + signature verification. MockUSDC = test asset. They communicate through narrow, explicit functions; pool/registry only accept calls from the controller address set by the owner.

---

## Task 1: Monorepo + Foundry scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `packages/contracts/foundry.toml`
- Create: `packages/contracts/.env.example`
- Create: `packages/contracts/src/.gitkeep` (placeholder, removed in Task 2)

- [ ] **Step 1: Create root workspace `package.json`**

```json
{
  "name": "anticipo",
  "private": true,
  "version": "0.1.0",
  "description": "Anticipo — AI invoice-factoring on Arbitrum",
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Create `packages/contracts/foundry.toml`**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200
remappings = ["@openzeppelin/=lib/openzeppelin-contracts/"]
fs_permissions = [{ access = "read", path = "./" }]

[rpc_endpoints]
arbitrum_sepolia = "${ARBITRUM_SEPOLIA_RPC_URL}"

[etherscan]
arbitrum_sepolia = { key = "${ARBISCAN_API_KEY}", url = "https://api-sepolia.arbiscan.io/api", chain = 421614 }
```

- [ ] **Step 4: Create `packages/contracts/.env.example`**

```bash
# RPC for Arbitrum Sepolia (Alchemy/Infura/public)
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
# Deployer private key (testnet only, 0x-prefixed)
DEPLOYER_PRIVATE_KEY=0x
# Address of the AI underwriter signing key (its public address)
UNDERWRITER_ADDRESS=0x
# Arbiscan API key for verification
ARBISCAN_API_KEY=
```

- [ ] **Step 5: Create placeholder so the dir exists**

Create `packages/contracts/src/.gitkeep` with a single newline.

- [ ] **Step 6: Commit scaffold (clean tree required before `forge install`)**

```bash
git add package.json pnpm-workspace.yaml packages/contracts/foundry.toml packages/contracts/.env.example packages/contracts/src/.gitkeep
git commit -m "chore: scaffold pnpm monorepo + foundry contracts package"
```

- [ ] **Step 7: Install OpenZeppelin v5.1.0 (run from `packages/contracts`)**

Run: `cd packages/contracts && forge install OpenZeppelin/openzeppelin-contracts@v5.1.0`
Expected: creates `packages/contracts/lib/openzeppelin-contracts` and a `.gitmodules` entry. If forge complains about a dirty tree, ensure Step 6 was committed first.

- [ ] **Step 8: Verify empty build compiles**

Run: `cd packages/contracts && forge build`
Expected: `Compiling...` then success with no source contracts yet (only lib). No errors.

- [ ] **Step 9: Commit the dependency**

```bash
git add .gitmodules packages/contracts/lib
git commit -m "chore: add OpenZeppelin contracts v5.1.0 dependency"
```

---

## Task 2: MockUSDC

**Files:**
- Create: `packages/contracts/src/MockUSDC.sol`
- Test: `packages/contracts/test/MockUSDC.t.sol`
- Delete: `packages/contracts/src/.gitkeep`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/test/MockUSDC.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC usdc;
    address alice = address(0xA11CE);

    function setUp() public {
        usdc = new MockUSDC();
    }

    function test_decimalsIsSix() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_symbolAndName() public view {
        assertEq(usdc.symbol(), "USDC");
        assertEq(usdc.name(), "Mock USD Coin");
    }

    function test_anyoneCanMint() public {
        usdc.mint(alice, 1_000_000); // 1 USDC (6 decimals)
        assertEq(usdc.balanceOf(alice), 1_000_000);
    }
}
```

Note: `forge-std` ships with Foundry; the remapping `forge-std/` resolves automatically when installed. If `forge-std` is missing, run `cd packages/contracts && forge install foundry-rs/forge-std` and commit it like Task 1 Step 9.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/contracts && forge test --match-contract MockUSDCTest`
Expected: FAIL — compile error, `MockUSDC` source not found.

- [ ] **Step 3: Write minimal implementation**

Create `packages/contracts/src/MockUSDC.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Testnet USDC stand-in: 6 decimals, open mint for faucet/seeding.
/// Production uses Circle native USDC; token address is a deploy-time config var.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

Then delete `packages/contracts/src/.gitkeep`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/contracts && forge test --match-contract MockUSDCTest -vv`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/MockUSDC.sol packages/contracts/test/MockUSDC.t.sol
git rm --cached packages/contracts/src/.gitkeep 2>/dev/null; rm -f packages/contracts/src/.gitkeep
git commit -m "feat(contracts): MockUSDC 6-decimal test stablecoin"
```

---

## Task 3: LiquidityPool (ERC-4626 vault)

**Files:**
- Create: `packages/contracts/src/LiquidityPool.sol`
- Test: `packages/contracts/test/LiquidityPool.t.sol`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/test/LiquidityPool.t.sol`:

```solidity
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/contracts && forge test --match-contract LiquidityPoolTest`
Expected: FAIL — compile error, `LiquidityPool` source not found.

- [ ] **Step 3: Write minimal implementation**

Create `packages/contracts/src/LiquidityPool.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice ERC-4626 USDC vault. LPs deposit USDC for shares; factoring fees raise
/// share price (yield); defaults lower it (non-recourse loss socialized to LPs).
/// Only the FactoringController may advance, mark repayment, or realize loss.
contract LiquidityPool is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    address public controller;
    uint256 public outstandingPrincipal;

    event ControllerSet(address indexed controller);
    event Advanced(address indexed to, uint256 amount);
    event RepaymentNotified(uint256 principal);
    event LossRealized(uint256 principal);

    error NotController();
    error InsufficientLiquidity();

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    constructor(IERC20 asset_)
        ERC20("Anticipo USDC Vault", "aUSDC")
        ERC4626(asset_)
        Ownable(msg.sender)
    {}

    function setController(address controller_) external onlyOwner {
        controller = controller_;
        emit ControllerSet(controller_);
    }

    /// @dev Total managed value = idle cash + principal currently out on advances.
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + outstandingPrincipal;
    }

    function availableLiquidity() public view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function advance(address to, uint256 amount) external onlyController {
        if (IERC20(asset()).balanceOf(address(this)) < amount) revert InsufficientLiquidity();
        outstandingPrincipal += amount;
        IERC20(asset()).safeTransfer(to, amount);
        emit Advanced(to, amount);
    }

    /// @dev Call AFTER the controller has transferred principal (+fee) cash into the pool.
    function notifyRepayment(uint256 principal) external onlyController {
        outstandingPrincipal -= principal;
        emit RepaymentNotified(principal);
    }

    function realizeLoss(uint256 principal) external onlyController {
        outstandingPrincipal -= principal;
        emit LossRealized(principal);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/contracts && forge test --match-contract LiquidityPoolTest -vv`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/LiquidityPool.sol packages/contracts/test/LiquidityPool.t.sol
git commit -m "feat(contracts): ERC-4626 LiquidityPool with controller-gated advance/repay/loss"
```

---

## Task 4: InvoiceRegistry (ERC-721 receivable + reputation)

**Files:**
- Create: `packages/contracts/src/InvoiceRegistry.sol`
- Test: `packages/contracts/test/InvoiceRegistry.t.sol`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/test/InvoiceRegistry.t.sol`:

```solidity
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
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/contracts && forge test --match-contract InvoiceRegistryTest`
Expected: FAIL — compile error, `InvoiceRegistry` source not found.

- [ ] **Step 3: Write minimal implementation**

Create `packages/contracts/src/InvoiceRegistry.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice One ERC-721 per financed invoice (held by the pool as the receivable),
/// plus per-buyer reputation counters that the AI underwriter reads as its signal.
contract InvoiceRegistry is ERC721, Ownable {
    enum Status { None, Financed, Repaid, Defaulted }

    struct Invoice {
        address smb;
        address buyer;
        uint256 faceAmount;
        uint64 dueDate;
        uint16 advanceRatioBps;
        uint16 feeBps;
        uint256 advanceAmount;
        Status status;
        bytes32 docHash;
    }

    struct Reputation {
        uint32 paidOnTime;
        uint32 paidLate;
        uint32 defaulted;
        uint256 totalVolumeRepaid;
        uint64 firstSeen;
    }

    address public controller;
    uint256 public nextId = 1;

    mapping(uint256 => Invoice) private _invoices;
    mapping(address => Reputation) private _buyerRep;

    event ControllerSet(address indexed controller);
    event InvoiceMinted(uint256 indexed id, address indexed smb, address indexed buyer, uint256 faceAmount, uint256 advanceAmount);
    event InvoiceRepaid(uint256 indexed id, bool onTime);
    event InvoiceDefaulted(uint256 indexed id);

    error NotController();

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    constructor() ERC721("Anticipo Receivable", "ANTR") Ownable(msg.sender) {}

    function setController(address controller_) external onlyOwner {
        controller = controller_;
        emit ControllerSet(controller_);
    }

    function mintInvoice(
        address to,
        address smb,
        address buyer,
        uint256 faceAmount,
        uint64 dueDate,
        uint16 advanceRatioBps,
        uint16 feeBps,
        uint256 advanceAmount,
        bytes32 docHash
    ) external onlyController returns (uint256 id) {
        id = nextId++;
        _invoices[id] = Invoice({
            smb: smb,
            buyer: buyer,
            faceAmount: faceAmount,
            dueDate: dueDate,
            advanceRatioBps: advanceRatioBps,
            feeBps: feeBps,
            advanceAmount: advanceAmount,
            status: Status.Financed,
            docHash: docHash
        });
        if (_buyerRep[buyer].firstSeen == 0) {
            _buyerRep[buyer].firstSeen = uint64(block.timestamp);
        }
        _mint(to, id);
        emit InvoiceMinted(id, smb, buyer, faceAmount, advanceAmount);
    }

    function markRepaid(uint256 id, bool onTime) external onlyController {
        Invoice storage inv = _invoices[id];
        inv.status = Status.Repaid;
        Reputation storage rep = _buyerRep[inv.buyer];
        if (onTime) rep.paidOnTime++; else rep.paidLate++;
        rep.totalVolumeRepaid += inv.faceAmount;
        emit InvoiceRepaid(id, onTime);
    }

    function markDefaulted(uint256 id) external onlyController {
        Invoice storage inv = _invoices[id];
        inv.status = Status.Defaulted;
        _buyerRep[inv.buyer].defaulted++;
        emit InvoiceDefaulted(id);
    }

    function getInvoice(uint256 id) external view returns (Invoice memory) {
        return _invoices[id];
    }

    function getBuyerReputation(address buyer) external view returns (Reputation memory) {
        return _buyerRep[buyer];
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/contracts && forge test --match-contract InvoiceRegistryTest -vv`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/InvoiceRegistry.sol packages/contracts/test/InvoiceRegistry.t.sol
git commit -m "feat(contracts): ERC-721 InvoiceRegistry with buyer reputation"
```

---

## Task 5: FactoringController (EIP-712 verify + finance/settle/default)

**Files:**
- Create: `packages/contracts/src/FactoringController.sol`
- Test: `packages/contracts/test/FactoringController.t.sol`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/test/FactoringController.t.sol`:

```solidity
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
        vm.prank(smb);
        uint256 id = ctrl.requestFinancing(q, _sign(q));

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
        vm.prank(smb);
        uint256 id = ctrl.requestFinancing(q, _sign(q));
        vm.expectRevert(FactoringController.TooEarlyToDefault.selector);
        ctrl.markDefaulted(id);
    }

    function test_markDefaultedAfterGraceRealizesLoss() public {
        FactoringController.Quote memory q = _quote();
        vm.prank(smb);
        uint256 id = ctrl.requestFinancing(q, _sign(q));

        vm.warp(q.dueDate + 7 days + 1);
        ctrl.markDefaulted(id);

        assertEq(pool.outstandingPrincipal(), 0);
        assertEq(pool.totalAssets(), 920_000_000); // 1000 - 80 lost
        assertEq(uint8(reg.getInvoice(id).status), uint8(InvoiceRegistry.Status.Defaulted));
        assertEq(reg.getBuyerReputation(buyer).defaulted, 1);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/contracts && forge test --match-contract FactoringControllerTest`
Expected: FAIL — compile error, `FactoringController` source not found.

- [ ] **Step 3: Write minimal implementation**

Create `packages/contracts/src/FactoringController.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {LiquidityPool} from "./LiquidityPool.sol";
import {InvoiceRegistry} from "./InvoiceRegistry.sol";

/// @notice Orchestrates factoring. Accepts an EIP-712 `Quote` signed by the registered
/// AI underwriter, mints the receivable, advances USDC from the pool, settles on buyer
/// payment, and writes off defaults. The underwriter never sends a transaction; its
/// decision is verified on-chain via signature.
contract FactoringController is EIP712, Ownable {
    using SafeERC20 for IERC20;

    struct Quote {
        address smb;
        address buyer;
        uint256 faceAmount;
        uint64 dueDate;
        uint16 advanceRatioBps;
        uint16 feeBps;
        uint256 advanceAmount;
        bytes32 docHash;
        uint64 expiry;
        uint256 nonce;
    }

    bytes32 public constant QUOTE_TYPEHASH = keccak256(
        "Quote(address smb,address buyer,uint256 faceAmount,uint64 dueDate,uint16 advanceRatioBps,uint16 feeBps,uint256 advanceAmount,bytes32 docHash,uint64 expiry,uint256 nonce)"
    );

    uint16 public constant MAX_ADVANCE_RATIO_BPS = 9500;
    uint16 public constant MAX_FEE_BPS = 2000;
    uint64 public constant GRACE_PERIOD = 7 days;

    IERC20 public immutable usdc;
    LiquidityPool public immutable pool;
    InvoiceRegistry public immutable registry;

    address public underwriter;
    mapping(uint256 => bool) public usedNonce;

    event UnderwriterSet(address indexed underwriter);
    event Financed(uint256 indexed id, address indexed smb, address indexed buyer, uint256 advanceAmount, uint16 feeBps);
    event Settled(uint256 indexed id, address payer, uint256 principal, uint256 fee, uint256 remainder);
    event Defaulted(uint256 indexed id, uint256 principalLoss);

    error InvalidSignature();
    error QuoteExpired();
    error NonceUsed();
    error BadTerms();
    error NotSmb();
    error NotFinanced();
    error TooEarlyToDefault();

    constructor(IERC20 usdc_, LiquidityPool pool_, InvoiceRegistry registry_, address underwriter_)
        EIP712("Anticipo", "1")
        Ownable(msg.sender)
    {
        usdc = usdc_;
        pool = pool_;
        registry = registry_;
        underwriter = underwriter_;
    }

    function setUnderwriter(address underwriter_) external onlyOwner {
        underwriter = underwriter_;
        emit UnderwriterSet(underwriter_);
    }

    function hashQuote(Quote calldata q) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            QUOTE_TYPEHASH, q.smb, q.buyer, q.faceAmount, q.dueDate,
            q.advanceRatioBps, q.feeBps, q.advanceAmount, q.docHash, q.expiry, q.nonce
        )));
    }

    function requestFinancing(Quote calldata q, bytes calldata sig) external returns (uint256 id) {
        if (msg.sender != q.smb) revert NotSmb();
        if (block.timestamp > q.expiry) revert QuoteExpired();
        if (usedNonce[q.nonce]) revert NonceUsed();
        if (q.advanceRatioBps > MAX_ADVANCE_RATIO_BPS || q.feeBps > MAX_FEE_BPS) revert BadTerms();
        uint256 fee = q.faceAmount * q.feeBps / 10_000;
        if (q.advanceAmount == 0) revert BadTerms();
        if (q.advanceAmount > q.faceAmount * q.advanceRatioBps / 10_000) revert BadTerms();
        if (q.advanceAmount + fee > q.faceAmount) revert BadTerms();

        if (ECDSA.recover(hashQuote(q), sig) != underwriter) revert InvalidSignature();

        usedNonce[q.nonce] = true;

        id = registry.mintInvoice(
            address(pool), q.smb, q.buyer, q.faceAmount, q.dueDate,
            q.advanceRatioBps, q.feeBps, q.advanceAmount, q.docHash
        );
        pool.advance(q.smb, q.advanceAmount);
        emit Financed(id, q.smb, q.buyer, q.advanceAmount, q.feeBps);
    }

    function payInvoice(uint256 id) external {
        InvoiceRegistry.Invoice memory inv = registry.getInvoice(id);
        if (inv.status != InvoiceRegistry.Status.Financed) revert NotFinanced();

        uint256 fee = inv.faceAmount * inv.feeBps / 10_000;
        uint256 principal = inv.advanceAmount;
        uint256 remainder = inv.faceAmount - principal - fee;

        usdc.safeTransferFrom(msg.sender, address(pool), principal + fee);
        if (remainder > 0) usdc.safeTransferFrom(msg.sender, inv.smb, remainder);

        pool.notifyRepayment(principal);
        registry.markRepaid(id, block.timestamp <= inv.dueDate);
        emit Settled(id, msg.sender, principal, fee, remainder);
    }

    function markDefaulted(uint256 id) external {
        InvoiceRegistry.Invoice memory inv = registry.getInvoice(id);
        if (inv.status != InvoiceRegistry.Status.Financed) revert NotFinanced();
        if (block.timestamp <= inv.dueDate + GRACE_PERIOD) revert TooEarlyToDefault();

        pool.realizeLoss(inv.advanceAmount);
        registry.markDefaulted(id);
        emit Defaulted(id, inv.advanceAmount);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/contracts && forge test --match-contract FactoringControllerTest -vv`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/FactoringController.sol packages/contracts/test/FactoringController.t.sol
git commit -m "feat(contracts): FactoringController with EIP-712 underwriter attestation, settlement, default"
```

---

## Task 6: Integration test (full lifecycle)

**Files:**
- Test: `packages/contracts/test/Integration.t.sol`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/test/Integration.t.sol`:

```solidity
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
        assertEq(pool.convertToAssets(shares), 1_003_000_000);

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
```

- [ ] **Step 2: Run test to verify it fails, then passes**

Run: `cd packages/contracts && forge test --match-contract IntegrationTest -vv`
Expected: PASS (all contracts already exist from Tasks 2–5). If a calculation assertion fails, fix the test's expected numbers to match the contract math (do not change contract logic to match the test unless the contract is wrong).

- [ ] **Step 3: Run the full suite**

Run: `cd packages/contracts && forge test -vv`
Expected: PASS — all tests across MockUSDC, LiquidityPool, InvoiceRegistry, FactoringController, Integration.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/test/Integration.t.sol
git commit -m "test(contracts): end-to-end repaid+default share-price trajectory"
```

---

## Task 7: Deploy script

**Files:**
- Create: `packages/contracts/script/Deploy.s.sol`

- [ ] **Step 1: Write the deploy script**

Create `packages/contracts/script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {LiquidityPool} from "../src/LiquidityPool.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";
import {FactoringController} from "../src/FactoringController.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// Deploys the full stack and wires the controller into the pool and registry.
/// Reads DEPLOYER_PRIVATE_KEY and UNDERWRITER_ADDRESS from the environment.
contract Deploy is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address underwriter = vm.envAddress("UNDERWRITER_ADDRESS");

        vm.startBroadcast(deployerPk);

        MockUSDC usdc = new MockUSDC();
        LiquidityPool pool = new LiquidityPool(IERC20(address(usdc)));
        InvoiceRegistry registry = new InvoiceRegistry();
        FactoringController controller =
            new FactoringController(IERC20(address(usdc)), pool, registry, underwriter);

        pool.setController(address(controller));
        registry.setController(address(controller));

        vm.stopBroadcast();

        console2.log("MockUSDC:           ", address(usdc));
        console2.log("LiquidityPool:      ", address(pool));
        console2.log("InvoiceRegistry:    ", address(registry));
        console2.log("FactoringController:", address(controller));
        console2.log("Underwriter:        ", underwriter);
    }
}
```

- [ ] **Step 2: Dry-run the deploy script against a local fork (no broadcast)**

Set a throwaway env for the dry run:
```bash
cd packages/contracts
export DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export UNDERWRITER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
forge script script/Deploy.s.sol:Deploy
```
Expected: simulation succeeds, logs five addresses, no broadcast (no `--broadcast` flag). The two private keys above are Anvil's well-known test keys — never used on a real network.

- [ ] **Step 3: Confirm build is clean and gas-snapshot the suite**

Run: `cd packages/contracts && forge build && forge test --gas-report`
Expected: build OK; all tests pass; gas report prints.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/script/Deploy.s.sol
git commit -m "feat(contracts): deploy script wiring pool+registry to controller"
```

> **Live deployment to Arbitrum Sepolia is deferred to Phase 4** (after the agent and frontend exist), so a real underwriter address and funded deployer are wired in once. Phase 1 ends with a green test suite and a verified-by-dry-run deploy script.

---

## Self-Review

**1. Spec coverage (Phase 1 portion):**
- §5 MockUSDC → Task 2 ✓
- §5 LiquidityPool (ERC-4626, totalAssets, advance, repay, loss) → Task 3 ✓
- §5 InvoiceRegistry (ERC-721, struct, status, reputation) → Task 4 ✓
- §5 FactoringController (EIP-712 verify, requestFinancing, payInvoice, markDefaulted, roles) → Task 5 ✓
- §4 decision 2 (EIP-712 attestation, not privileged sender) → Task 5 `requestFinancing` ✓
- §4 decision 8 (non-recourse loss to pool, grace, reputation) → Tasks 3/5 ✓
- §9 on-chain data flow (advance → settle → repaid / default) → Task 6 integration ✓
- §10 demo mechanics (different terms → different outcomes; default drops share price) → Task 6 ✓
- Deploy wiring → Task 7 ✓
- Deferred to later phases (correctly out of scope here): AI agent §6, frontend §7, AA §4.4, seeder/live deploy §4.4/§10. Mapped in the roadmap table.

**2. Placeholder scan:** No "TBD/TODO/handle edge cases" — every step has full code or an exact command. ✓

**3. Type consistency:** `Quote` fields and order are identical in the contract, the `QUOTE_TYPEHASH` string, `hashQuote`'s `abi.encode`, and every test/script builder. `Status` enum (None/Financed/Repaid/Defaulted) used consistently. `advance/notifyRepayment/realizeLoss` names match between `LiquidityPool` and `FactoringController` calls. `mintInvoice` argument order matches between registry and controller. `getInvoice`/`getBuyerReputation` return the documented structs. ✓

**4. Math check:** face = advance + fee + remainder enforced by `advanceAmount + fee <= faceAmount` guard; `notifyRepayment` only adjusts `outstandingPrincipal` (cash pushed in separately by controller), so fee becomes pure yield; `realizeLoss` drops `totalAssets` by exactly the written-off principal. Integration test numbers (1000 → 1003 after +3 fee → 933 after −70 loss) follow. ✓
