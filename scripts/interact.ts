import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

async function main() {
  const connection = await network.getOrCreate();
  const networkName = connection.networkName;
  const { ethers } = connection;
  const [deployer] = await ethers.getSigners();

  const buyerPrivateKey = process.env.BUYER_PRIVATE_KEY;
  if (!buyerPrivateKey) {
    throw new Error("BUYER_PRIVATE_KEY not found in .env");
  }
  const buyer = new ethers.Wallet(buyerPrivateKey, ethers.provider);

  const deploymentsFile = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(deploymentsFile)) {
    throw new Error(`${deploymentsFile} not found.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  const { contracts } = deployment;

  console.log(`Owner: ${deployer.address}`);
  console.log(`Buyer: ${buyer.address}`);

  const mockUSDT = await ethers.getContractAt("MockUSDT", contracts.MockUSDT.address);
  const tsaleToken = await ethers.getContractAt("TSaleToken", contracts.TSaleToken.address);
  const escrow = await ethers.getContractAt("TokenSaleEscrow", contracts.TokenSaleEscrow.address);

  const mockUSDTBuyer = await ethers.getContractAt("MockUSDT", contracts.MockUSDT.address, buyer);
  const escrowBuyer = await ethers.getContractAt("TokenSaleEscrow", contracts.TokenSaleEscrow.address, buyer);

  const buyAmount = ethers.parseEther("10");
  const cost = await escrow.calculateCost(buyAmount);

  // Mint mUSDT to buyer if balance is insufficient
  const buyerBalance = await mockUSDT.balanceOf(buyer.address);
  if (buyerBalance < cost) {
    console.log("Minting mUSDT for buyer...");
    const mintTx = await mockUSDT.mint(buyer.address, cost * 10n);
    await mintTx.wait();
    console.log(`Minted mUSDT: ${mintTx.hash}`);
  }

  console.log(`Cost for 10 TSALE: ${ethers.formatUnits(cost, 6)} mUSDT`);

  console.log("Approving token spend...");
  const approveTx = await mockUSDTBuyer.approve(contracts.TokenSaleEscrow.address, cost);
  await approveTx.wait();
  console.log(`Approval tx hash : ${approveTx.hash}`);
  console.log(`BscScan: https://testnet.bscscan.com/tx/${approveTx.hash}`);

  console.log("Purchasing tokens...");
  const buyTx = await escrowBuyer.buyTokens(buyAmount);
  await buyTx.wait();
  console.log(`Purchase tx hash : ${buyTx.hash}`);
  console.log(`BscScan: https://testnet.bscscan.com/tx/${buyTx.hash}`);

  const buyerMUSDT = await mockUSDT.balanceOf(buyer.address);
  const buyerTSALE = await tsaleToken.balanceOf(buyer.address);
  console.log(`Buyer mUSDT balance: ${ethers.formatUnits(buyerMUSDT, 6)}`);
  console.log(`Buyer TSALE balance: ${ethers.formatEther(buyerTSALE)}`);

  console.log("Withdrawing payments...");
  const withdrawTx = await escrow.withdrawPayments(deployer.address);
  await withdrawTx.wait();
  console.log(`Withdrawal tx hash: ${withdrawTx.hash}`);
  console.log(`BscScan: https://testnet.bscscan.com/tx/${withdrawTx.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
