import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connection = await network.getOrCreate();
  const networkName = connection.networkName;
  const { ethers } = connection;
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} BNB`);

  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy(deployer.address);
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  console.log(`MockUSDT deployed at: ${mockUSDTAddress}`);
  const mockUSDTDeployTx = mockUSDT.deploymentTransaction();
  if (mockUSDTDeployTx) {
    console.log("Waiting for 5 block confirmations (MockUSDT)...");
    await mockUSDTDeployTx.wait(5);
  }

  const TSaleToken = await ethers.getContractFactory("TSaleToken");
  const tsaleToken = await TSaleToken.deploy(deployer.address);
  await tsaleToken.waitForDeployment();
  const tsaleTokenAddress = await tsaleToken.getAddress();
  console.log(`TSaleToken deployed at: ${tsaleTokenAddress}`);
  const tsaleTokenDeployTx = tsaleToken.deploymentTransaction();
  if (tsaleTokenDeployTx) {
    console.log("Waiting for 5 block confirmations (TSaleToken)...");
    await tsaleTokenDeployTx.wait(5);
  }

  const rate = 1n;
  const maxPerWallet = ethers.parseEther("1000");
  const minPurchase = ethers.parseEther("1");

  const TokenSaleEscrow = await ethers.getContractFactory("TokenSaleEscrow");
  const escrow = await TokenSaleEscrow.deploy(
    mockUSDTAddress,
    tsaleTokenAddress,
    rate,
    maxPerWallet,
    minPurchase
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`TokenSaleEscrow deployed at: ${escrowAddress}`);
  const escrowDeployTx = escrow.deploymentTransaction();
  if (escrowDeployTx) {
    console.log("Waiting for 5 block confirmations (TokenSaleEscrow)...");
    await escrowDeployTx.wait(5);
  }

  const fundAmount = ethers.parseEther("500000");
  const fundTx = await tsaleToken.transfer(escrowAddress, fundAmount);
  await fundTx.wait();
  const escrowBalance = await tsaleToken.balanceOf(escrowAddress);
  console.log(`Escrow TSALE balance: ${ethers.formatEther(escrowBalance)} TSALE`);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deployment = {
    network: networkName,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MockUSDT: {
        address: mockUSDTAddress,
        constructorArgs: [deployer.address],
      },
      TSaleToken: {
        address: tsaleTokenAddress,
        constructorArgs: [deployer.address],
      },
      TokenSaleEscrow: {
        address: escrowAddress,
        constructorArgs: [
          mockUSDTAddress,
          tsaleTokenAddress,
          rate.toString(),
          maxPerWallet.toString(),
          minPurchase.toString(),
        ],
      },
    },
  };

  const outFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log(`Deployment info saved to deployments/${networkName}.json`);

  console.log("Deployment completed! All contracts confirmed on-chain.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
