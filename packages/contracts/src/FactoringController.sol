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

        // Effects before interactions (CEI). USDC is a hookless ERC20, so the
        // transfers below cannot re-enter; ordering effects first is belt-and-suspenders.
        pool.notifyRepayment(principal);
        registry.markRepaid(id, block.timestamp <= inv.dueDate);

        usdc.safeTransferFrom(msg.sender, address(pool), principal + fee);
        if (remainder > 0) usdc.safeTransferFrom(msg.sender, inv.smb, remainder);

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
