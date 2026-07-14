import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connection = await network.getOrCreate();
  const { ethers } = connection;
  const [owner] = await ethers.getSigners();

  const deployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "deployments", `${connection.networkName}.json`),
      "utf8"
    )
  );

  const escrow = await ethers.getContractAt(
    "TokenSaleEscrow",
    deployment.contracts.TokenSaleEscrow.address
  );

  const newMin = ethers.parseEther("20");

  const oldMin = await escrow.minPurchase();
  console.log("Old Min Purchase:", ethers.formatEther(oldMin));

  if (oldMin === newMin) {
    console.log("Min purchase is already set to this value. No transaction needed.");
    return;
  }

  const tx = await escrow.setMinPurchase(newMin);
  console.log("Transaction submitted:", tx.hash);
  console.log("Waiting for 2 block confirmations to ensure RPC sync...");
  await tx.wait(2);

  console.log("Transaction confirmed!");

  let currentMin = await escrow.minPurchase();
  let retries = 0;
  while (currentMin === oldMin && retries < 5) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    currentMin = await escrow.minPurchase();
    retries++;
  }

  console.log("New Min Purchase:", ethers.formatEther(currentMin));
}

main().catch(console.error);