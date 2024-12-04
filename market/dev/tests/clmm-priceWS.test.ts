// Import the necessary modules
import { Connection, PublicKey, AccountSubscriptionConfig } from '@solana/web3.js';
import { connection } from '../../utils/utils';
import { deserializeClmmPoolInfo } from '../../fetch/raydium_clmm';
import { sqrtPriceX64ToPrice } from '../../utils/utils';
// The account address you want to monitor
const ACCOUNT_ADDRESS = "3B5vXBEYAmV8y13pgvzSi7eLDFS5tRd4pZZZPNuA4Ao2";


// Convert the account address to a PublicKey object
const publicKey = new PublicKey(ACCOUNT_ADDRESS);

// Counter for the number of updates received
let updateCount = 0;
const MAX_UPDATES = 3;

// Function to handle account changes
async function handleAccountChange (accountInfo, context) {
  updateCount += 1;
  console.log(`Update ${updateCount}:`, accountInfo);
  const data = Buffer.from(accountInfo.data)
  const deserializedData = await deserializeClmmPoolInfo(data);
  const poolInfo = deserializedData;

  const sqrtPriceX64 = poolInfo.sqrtPriceX64; // Should be a string

  const decimalsA = poolInfo.mintDecimalsA;
  const decimalsB = poolInfo.mintDecimalsB;

  const price = sqrtPriceX64ToPrice(sqrtPriceX64, decimalsA, decimalsB);
  console.log(`Price:`, price)
  if (updateCount >= MAX_UPDATES) {
    // Unsubscribe from account changes
    connection.removeAccountChangeListener(subscriptionId);
  }
};

// Subscribe to account changes with the updated method signature
const subscriptionId = connection.onAccountChange(
  publicKey,
  async (updatedAccountInfo, context) => {
    handleAccountChange(updatedAccountInfo, context);
    
  },
  { commitment: 'confirmed'} // Updated to use AccountSubscriptionConfig
);

console.log(`Subscribed to account changes for ${ACCOUNT_ADDRESS} with subscription ID: ${subscriptionId}`);
