import hre, { network } from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = await network.connect();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Starting Crowdfund deployment...");
  console.log("📋 Deploying with account:", deployer.address);
  
  const provider = deployer.provider;
  if (provider) {
    console.log("💰 Account balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "ETH");
  }
  
  // Contract parameters - adjust these as needed
  const goalInEth = "10"; // 10 ETH goal
  const durationInDays = 30; // 30 days
  
  // For development, use deployer as beneficiary
  // In production, this should be a different address
  const beneficiaryAddress = deployer.address;
  
  const goal = ethers.parseEther(goalInEth);
  
  console.log("📊 Campaign Parameters:");
  console.log("   🎯 Goal:", goalInEth, "ETH");
  console.log("   ⏰ Duration:", durationInDays, "days");
  console.log("   👤 Beneficiary:", beneficiaryAddress);
  
  // Deploy the contract using the new syntax
  console.log("⚙️  Deploying Crowdfund contract...");
  const crowdfund = await ethers.deployContract("Crowdfund", [goal, durationInDays, beneficiaryAddress]);
  
  // Wait for deployment to be mined
  await crowdfund.waitForDeployment();
  
  const contractAddress = await crowdfund.getAddress();
  console.log("✅ Crowdfund deployed to:", contractAddress);
  
  // Get deployment details
  const network = await ethers.provider.getNetwork();
  const deploymentTx = crowdfund.deploymentTransaction();
  
  if (deploymentTx) {
    console.log("📄 Transaction hash:", deploymentTx.hash);
    
    const receipt = await deploymentTx.wait();
    if (receipt) {
      console.log("⛽ Gas used:", receipt.gasUsed.toString());
      console.log("💸 Gas price:", ethers.formatUnits(receipt.gasPrice, "gwei"), "gwei");
      console.log("💰 Deployment cost:", ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "ETH");
    }
  }
  
  // Verify contract parameters
  console.log("\n🔍 Verifying deployment...");
  console.log("   Goal:", ethers.formatEther(await crowdfund.goal()), "ETH");
  console.log("   Beneficiary:", await crowdfund.beneficiary());
  
  const deadline = await crowdfund.deadline();
  const deploymentTime = Math.floor(Date.now() / 1000);
  const expectedDeadline = deploymentTime + (durationInDays * 24 * 60 * 60);
  
  console.log("   Deadline:", new Date(Number(deadline) * 1000).toLocaleString());
  console.log("   Time remaining:", Math.floor(Number(deadline) - deploymentTime), "seconds");
  
  // Create deployment info object
  const deploymentInfo = {
    contractName: "Crowdfund",
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    beneficiaryAddress: beneficiaryAddress,
    network: {
      name: network.name,
      chainId: Number(network.chainId)
    },
    parameters: {
      goal: goalInEth,
      durationInDays: durationInDays,
      deadline: Number(deadline)
    },
    transaction: {
      hash: deploymentTx?.hash,
      gasUsed: deploymentTx && (await deploymentTx.wait())?.gasUsed.toString(),
      blockNumber: deploymentTx && (await deploymentTx.wait())?.blockNumber
    },
    deployedAt: new Date().toISOString()
  };
  
  // Save deployment info to file
  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(
    deploymentsDir, 
    `crowdfund-${network.name}-${Date.now()}.json`
  );
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("📝 Deployment info saved to:", deploymentFile);
  
  // Save latest deployment for frontend
  const latestFile = path.join(deploymentsDir, `latest-${network.name}.json`);
  fs.writeFileSync(latestFile, JSON.stringify({
    contractAddress: contractAddress,
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: deploymentInfo.deployedAt
  }, null, 2));
  
  console.log("📝 Latest deployment info saved to:", latestFile);
  
  // Instructions for frontend integration
  console.log("\n📋 Next Steps:");
  console.log("1. Copy the contract address to your frontend environment:");
  console.log(`   NEXT_PUBLIC_CROWDFUND_ADDRESS=${contractAddress}`);
  console.log(`   NEXT_PUBLIC_CHAIN_ID=${Number(network.chainId)}`);
  
  console.log("\n2. Copy the ABI to your frontend:");
  console.log("   From: hardhat/artifacts/contracts/Crowdfund.sol/Crowdfund.json");
  console.log("   To: frontend/src/lib/abi/Crowdfund.json");
  
  console.log("\n3. Test the contract on the blockchain explorer:");
  if (network.chainId === 1n) {
    console.log(`   https://etherscan.io/address/${contractAddress}`);
  } else if (network.chainId === 11155111n) {
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
  } else if (network.chainId === 31337n) {
    console.log("   Local network - no explorer available");
  }
  
  console.log("\n✨ Deployment completed successfully!");
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
