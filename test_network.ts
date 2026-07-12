import hre from "hardhat";
async function main() {
    console.log("Network name:", hre.network.name);
}
main().catch(console.error);
