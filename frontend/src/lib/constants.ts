// Contract deployment configuration
export const CROWDFUND_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const CHAIN_ID = 31337; // Local Hardhat network

// Network configuration
export const NETWORKS = {
  31337: {
    name: "Localhost",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: null, // No explorer for local network
  },
  1: {
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://etherscan.io",
  },
  11155111: {
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://sepolia.etherscan.io",
  },
} as const;

// Contract parameters (from deployment)
export const CAMPAIGN_GOAL = "10000000000000000000"; // 10 ETH in wei
export const CAMPAIGN_DURATION_DAYS = 30;

// Utility constants
export const WEI_PER_ETH = "1000000000000000000";
export const GWEI_PER_ETH = "1000000000";
