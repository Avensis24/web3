
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import hre from "hardhat";

async function verifyContract(
  address: string,
  constructorArguments: any[],
  contractPath?: string
) {
  try {
    console.log(`Verifying ${address}...`);
    await hre.tasks.getTask("verify").run({
      address: address,
      constructorArgs: constructorArguments,
      contract: contractPath,
    });
    console.log(`Verified: ${address}`);
  } catch (err: any) {
    if (err.message?.toLowerCase().includes("already verified")) {
      console.log(`Already verified: ${address}`);
    } else {
      console.error(`Verification failed for ${address}:`, err.message);
    }
  }
}

async function main() {
  const connection = await hre.network.getOrCreate();
  const networkName = connection.networkName;

  const deploymentsFile = path.join(__dirname, "..", "deployments", `${networkName}.json`);

  if (!fs.existsSync(deploymentsFile)) {
    throw new Error(`Deployment file not found: ${deploymentsFile}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  const { contracts } = deployment;

  console.log(`Verifying on ${networkName}...`);

  await verifyContract(
    contracts.MockUSDT.address,
    contracts.MockUSDT.constructorArgs,
    "contracts/MockUSDT.sol:MockUSDT"
  );

  await verifyContract(
    contracts.TSaleToken.address,
    contracts.TSaleToken.constructorArgs,
    "contracts/TSaleToken.sol:TSaleToken"
  );

  await verifyContract(
    contracts.TokenSaleEscrow.address,
    [
      contracts.TokenSaleEscrow.constructorArgs[0],
      contracts.TokenSaleEscrow.constructorArgs[1],
      contracts.TokenSaleEscrow.constructorArgs[2].toString(),
      contracts.TokenSaleEscrow.constructorArgs[3].toString(),
      contracts.TokenSaleEscrow.constructorArgs[4].toString(),
    ],
    "contracts/TokenSaleEscrow.sol:TokenSaleEscrow"
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
