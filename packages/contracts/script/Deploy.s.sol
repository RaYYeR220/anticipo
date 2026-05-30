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
