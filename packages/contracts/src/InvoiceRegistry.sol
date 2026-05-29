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
