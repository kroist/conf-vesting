import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFactory = await deploy("ConfVestingWalletFactory", {
    from: deployer,
    log: true,
  });
  console.log(`ConfVestingWalletFactory contract: `, deployedFactory.address);
};
export default func;
func.id = "deploy_Factory"; // id required to prevent reexecution
func.tags = ["Factory"];
