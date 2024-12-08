// fetchVaultPrice.ts

import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import { getAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Account } from '@solana/spl-token';
import * as dotenv from 'dotenv';
import Logger from '../utils/logger'; // Adjust the path as necessary
import {PUMP_PROGRAM} from '../utils/utils'
import {market_PumpPriceFetch, PumpVaultData} from '../utils/interfaces';
import { error } from 'console';
// Load environment variables from .env file
dotenv.config();

// Initialize Logger
const logger = new Logger('pump_fetchPrice');

// Retrieve environment variables
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

// Function to fetch and log account data using getParsedAccountInfo
export async function fetchAndLogParsedAccountInfo(
  connection: Connection,
  accountPubKey: PublicKey,
  commitment: Commitment = 'confirmed'
): Promise<any> {
  try {
    // Fetch the parsed account data
    const accountInfo = await connection.getParsedAccountInfo(accountPubKey, commitment);

    if (accountInfo.value === null) {
      logger.error(`Error: Account ${accountPubKey.toBase58()} not found or not initialized.`);
      return null;
    }

    logger.debug('--- Parsed Account Information ---');
    logger.debug(JSON.stringify(accountInfo.value, null, 2));
    logger.debug('-----------------------------------\n');

    return accountInfo.value;
  } catch (error) {
    logger.error(`Error fetching parsed account data for ${accountPubKey.toBase58()}: ${error}`);
    throw error;
  }
}

// Function to fetch and log account data using getAccount from @solana/spl-token
async function fetchAndLogSplTokenAccount(
  connection: Connection,
  tokenPubKey: PublicKey,
  decimals: number, // Pass decimals as a parameter
  commitment: Commitment = 'confirmed'
): Promise<Account | null> {
  try {
    // Fetch the SPL Token account information
    const tokenAccount: Account = await getAccount(connection, tokenPubKey, commitment, TOKEN_PROGRAM_ID);
    logger.debug(`Fetched SPL Token Account: ${tokenPubKey.toBase58()}`);

    logger.debug('--- SPL Token Account Information ---');
    logger.debug(`Public Key: ${tokenPubKey.toBase58()}`);
    logger.debug(`Mint: ${tokenAccount.mint.toBase58()}`);
    logger.debug(`Owner: ${tokenAccount.owner.toBase58()}`);
    logger.debug(`Amount: ${Number(tokenAccount.amount) / Math.pow(10, decimals)} tokens`);
    logger.debug(`Delegate: ${tokenAccount.delegate ? tokenAccount.delegate.toBase58() : 'None'}`);
    logger.debug(`Is Initialized: ${tokenAccount.isInitialized}`);
    logger.debug(`Is Frozen: ${tokenAccount.isFrozen}`);
    logger.debug('-------------------------------------\n');

    return tokenAccount;
  } catch (error) {
    logger.error(`Error fetching SPL Token account data for ${tokenPubKey.toBase58()}: ${error}`);
    throw error;
  }
}

// Function to calculate the price
function calculatePrice(vaultData: PumpVaultData){
  const { solBalance, bonding_curveTokens } = vaultData;

  if (bonding_curveTokens === 0) {
    logger.error('Error: Bonding curve has zero tokens. Cannot calculate price.');
    return;
  }

  const pricePerToken = solBalance / bonding_curveTokens;

  logger.debug('--- Derived Price Information ---');
  logger.debug(`SOL in Vault: ${solBalance} SOL`);
  logger.debug(`Tokens in Bonding Curve: ${bonding_curveTokens} tokens`);
  logger.info(`Price per Token: ${pricePerToken.toFixed(9)} SOL/token`);
  logger.debug('----------------------------------\n');

  return pricePerToken;
}

/// Function to fetch bonding Curve addresses
async function fetchVaultAddresses(
    tokenMint: string
  ): Promise<{ bonding_curve: string, associated_bonding_curve : string } | null> {
    try {
      const pumpProgramAddress = new PublicKey(PUMP_PROGRAM);
      const mint = new PublicKey(tokenMint);
  
      const [bc] = PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'), mint.toBytes()], pumpProgramAddress);
      const [abc] = PublicKey.findProgramAddressSync([bc.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID);
  
      // logger.debug(bc)
      // logger.debug(abc)
      const bonding_curve = (bc).toBase58().toString();
      const associated_bonding_curve = (abc).toBase58().toString();
           
      return { bonding_curve, associated_bonding_curve };
    } catch (error) {
      logger.error(`Error fetching bonding curves :  ${error}`);
      return null;
    }
  }
  
// Function to retrieve all necessary data and calculate price
async function getPricingData(tokenMint: string): Promise<{ tokenPrice: number; solVaultBalance: number; tokenVaultBalance: number;} | null> {
  // Fetch vault addresses and symbol from PostgreSQL
  const vaultData = await fetchVaultAddresses(tokenMint);

  if (!vaultData) {
    logger.error('Error: Unable to fetch vault addresses and symbol.');
    return null;
  }

  const { bonding_curve, associated_bonding_curve } = vaultData;

  // Initialize a connection to the Solana RPC
  const connection = new Connection(RPC_URL, 'confirmed');

  // Create PublicKey instances for the vaults
  let solVaultPubKey: PublicKey;
  let tokenVaultPubKey: PublicKey;

  try {
    solVaultPubKey = new PublicKey(bonding_curve);
    tokenVaultPubKey = new PublicKey(associated_bonding_curve);
  } catch (error) {
    logger.error(`Error creating PublicKey instances: ${error}`);
    return null;
  }

  try {
    // Fetch and log the parsed account data for the SOL vault
    const solVaultAccountInfo = await fetchAndLogParsedAccountInfo(connection, solVaultPubKey);

    // Fetch and log the parsed account data for the token mint
    const mintAccountInfo = await fetchAndLogParsedAccountInfo(connection, new PublicKey(tokenMint));

    // Extract decimals from the mint account
    const decimals = parseInt(mintAccountInfo.data.parsed.info.decimals);
    if (isNaN(decimals)) {
      logger.error('Error: Unable to parse decimals from mint account.');
      return null;
    }

    // Fetch and log the SPL Token account data for the token vault
    const tokenVaultAccount = await fetchAndLogSplTokenAccount(connection, tokenVaultPubKey, decimals);

    if (!solVaultAccountInfo || !mintAccountInfo || !tokenVaultAccount) {
      logger.error('Error: Missing account data. Cannot calculate price.');
      return null;
    }

    // Extract necessary data
    const solBalance = solVaultAccountInfo.lamports / Math.pow(10, 9); // Convert lamports to SOL
    const tokenSupply = parseFloat(mintAccountInfo.data.parsed.info.supply) / Math.pow(10, decimals);
    const bonding_curveTokens = Number(tokenVaultAccount.amount) / Math.pow(10, decimals);

    // Create a VaultData object
    const vaultData: PumpVaultData = {
      solBalance,
      tokenSupply,
      bonding_curveTokens,
      pricePerToken: 0, // Will be calculated
      decimals,
    //   symbol
    };

    // Calculate and log the price
    const price = calculatePrice(vaultData) || 0; // Provide default value

    // Return the required values
    return {
      tokenPrice: price,
      solVaultBalance: solBalance,
      tokenVaultBalance: bonding_curveTokens,
    //   symbol: symbol,
    };
  } catch (error) {
    logger.error(`Failed to fetch and process account data: ${error}`);
    return null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.debug('Received SIGINT. Closing PostgreSQL pool.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.debug('Received SIGTERM. Closing PostgreSQL pool.');
  process.exit(0);
});

// Main Execution Function (for standalone usage)
async function main() {
  // Parse command-line arguments for token mint
  const args = process.argv.slice(2);
  if (args.length === 0) {
    logger.error('Error: Token mint address must be provided as a command-line argument.');
    logger.debug('Usage: ts-node fetchVaultPrice.ts <TOKEN_MINT_ADDRESS>');
    process.exit(1);
  }

  const tokenMintInput = args[0];
  let tokenMintPubKey: PublicKey;

  try {
    tokenMintPubKey = new PublicKey(tokenMintInput);
  } catch (error) {
    logger.error(`Error: Invalid token mint address provided: ${tokenMintInput}`);
    process.exit(1);
  }

  // Get pricing data
  const pricingData = await getPricingData(tokenMintInput);

  if (!pricingData) {
    logger.error('Error: Unable to retrieve pricing data.');
    process.exit(1);
  }

  // Output the results in JSON format
  const output = {
    tokenPrice: pricingData.tokenPrice,
    solVaultBalance: pricingData.solVaultBalance,
    tokenVaultBalance: pricingData.tokenVaultBalance,
  };

  console.log(JSON.stringify(output, null, 2));

  logger.debug('Account data fetched, price calculated successfully.');
}

// Execute the main function if the script is run directly
if (require.main === module) {
  main();
}

// Export the getPricingData function for use in manualTrade.ts
export { getPricingData };


// // test
// async function test(mint : string) {
//     try {
//         const data = await getPricingData(mint);
//         console.log(data);
//     }catch {error};
// }

// const mint = 'AWxdedosYmBUj5XKMfrZJH4cDaagFDGUdPEhePtUpump';
// test(mint);

