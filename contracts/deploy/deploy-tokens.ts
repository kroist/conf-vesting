import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedToken1 = await deploy("MockERC7984", {
    from: deployer,
    log: true,
    args: ["ACME Token", "ACME"],
  });
  console.log(`MockERC7984 ACME Token contract: `, deployedToken1.address);

  const deployedToken2 = await deploy("MockERC7984", {
    from: deployer,
    log: true,
    args: ["Globex Token", "GLOBEX"],
  });
  console.log(`MockERC7984 GLOBEX Token contract: `, deployedToken2.address);

  const deployedToken3 = await deploy("MockERC7984", {
    from: deployer,
    log: true,
    args: ["Pepe Token", "PEPE"],
  });
  console.log(`MockERC7984 PEPE Token contract: `, deployedToken3.address);
};
export default func;
func.id = "deploy_Tokens"; // id required to prevent reexecution
func.tags = ["Tokens"];
