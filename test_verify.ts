import hre from "hardhat";

async function main() {
    console.log("Tasks available:", Array.from(hre.tasks.rootTasks.keys()).join(", "));
    const verifyTask = hre.tasks.getTask("verify");
    console.log("Verify task found:", !!verifyTask);
    console.log("run method exists:", typeof verifyTask.run === "function");
}

main().catch(console.error);
