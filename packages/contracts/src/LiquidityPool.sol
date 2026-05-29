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
