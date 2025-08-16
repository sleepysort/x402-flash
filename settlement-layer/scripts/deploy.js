const hre = require("hardhat");

async function main() {
  console.log("Deploying X402FlashSettlement contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance));

  const X402FlashSettlement = await hre.ethers.getContractFactory("X402FlashSettlement");
  const settlement = await X402FlashSettlement.deploy();

  await settlement.waitForDeployment();
  const contractAddress = await settlement.getAddress();

  console.log("X402FlashSettlement deployed to:", contractAddress);
  console.log("Transaction hash:", settlement.deploymentTransaction().hash);

  const network = await hre.ethers.provider.getNetwork();
  console.log("Deployed on network:", network.name, "chainId:", network.chainId);

  if (network.chainId !== 31337n && network.chainId !== 1337n) {
    console.log("\nWaiting for block confirmations...");
    await settlement.deploymentTransaction().wait(5);
    console.log("Confirmed!");

    if (process.env.BASESCAN_API_KEY) {
      console.log("\nVerifying contract on Basescan...");
      try {
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [],
        });
        console.log("Contract verified successfully!");
      } catch (error) {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("\nDeployment complete!");
  console.log("Settlement Contract Address:", contractAddress);
  console.log("\nAdd this address to your .env file:");
  console.log(`SETTLEMENT_CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });