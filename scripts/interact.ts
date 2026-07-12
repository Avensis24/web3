import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const networkName = network.name;
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  const deploymentsFile = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(deploymentsFile)) {
    throw new Error(`${deploymentsFile} not found.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  const { contracts } = deployment;

  console.log(`Signer: ${deployer.address}`);

  const mockUSDT = await ethers.getContractAt("MockUSDT", contracts.MockUSDT.address);
  const tsaleToken = await ethers.getContractAt("TSaleToken", contracts.TSaleToken.address);
  const escrow = await ethers.getContractAt("TokenSaleEscrow", contracts.TokenSaleEscrow.address);

  const buyAmount = ethers.parseEther("10");
  const cost = await escrow.calculateCost(buyAmount);

  console.log("Approving token spend...");
  const approveTx = await mockUSDT.approve(contracts.TokenSaleEscrow.address, cost);
  await approveTx.wait();
  console.log(`Approved: ${approveTx.hash}`);

  console.log("Purchasing tokens...");
  const buyTx = await escrow.buyTokens(buyAmount);
  await buyTx.wait();
  console.log(`Purchased: ${buyTx.hash}`);

  console.log("Withdrawing payments...");
  const withdrawTx = await escrow.withdrawPayments(deployer.address);
  await withdrawTx.wait();
  console.log(`Withdrawn: ${withdrawTx.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
