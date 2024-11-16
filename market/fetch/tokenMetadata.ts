// getTokenMetadata.ts
import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import Logger from "../utils/logger";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';
import { market_TokenMetadata } from '../utils/interfaces';
import { ENV, TokenListProvider } from "@solana/spl-token-registry";
// import fetch from 'node-fetch'; // For Node.js versions < 18
// Internal imports
import { redisPublisher } from '../utils/utils';

dotenv.config();  // Load environment variables from .env

// Use RPC_URL from .env file for the connection, or fallback to a default value if not defined
const rpcUrl = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(rpcUrl, "confirmed");

const logger = new Logger('tokenMetadata.log');



const redis = redisPublisher;

interface OffChainMetadata {
  image?: string;
  // Add other properties if needed
}

// Create Umi instance
const umi = createUmi(rpcUrl).use(mplTokenMetadata());

// Initialize token list provider
let tokenListPromise = (async () => {
  const provider = await new TokenListProvider().resolve();
  const tokenList = provider.filterByChainId(ENV.MainnetBeta).getList();
  return tokenList;
})();

// Get Token Metadata (cached in Redis)
export async function getTokenMetadata(mintAddress: string): Promise<market_TokenMetadata> {
  const cacheKey = `token_metadata_${mintAddress}`;

  // Check cache first
  const cachedMetadata = await redis.get(cacheKey);
  if (cachedMetadata) {
    return JSON.parse(cachedMetadata) as market_TokenMetadata;
  }

  const mintPublicKey = publicKey(mintAddress);

  // Initialize tokenMetadata with default values
  let tokenMetadata: market_TokenMetadata = {
    mint: '',
    name: '',
    symbol: '',
    uri: '',
    image: '',
    supply: 0,
    decimals: 0,
    sellerFeeBasisPoints: 0,
    mintAuthority: false,
    isInitialized: false,
    freezeAuthority: false,
    primarySaleHappened: false,
    updateAuthority:'',
    isMutable:false,
    rugCheck: false,
  };

  try {
    // Attempt to fetch the digital asset using Umi
    const asset = await fetchDigitalAsset(umi, mintPublicKey);

    // console.log(`Asset`, asset);

    // Map on-chain data to market_TokenMetadata
    tokenMetadata = {
      mint: asset.metadata.mint,
      name: asset.metadata.name,
      symbol: asset.metadata.symbol,
      uri: asset.metadata.uri,
      image: '',
      supply: Number(asset.mint.supply),
      decimals:asset.mint.decimals,
      sellerFeeBasisPoints: asset.metadata.sellerFeeBasisPoints,
      mintAuthority:asset.mint.mintAuthority.__option === 'Some',
      isInitialized:asset.mint.isInitialized,
      freezeAuthority:asset.mint.freezeAuthority.__option === 'Some',
      primarySaleHappened:asset.metadata.primarySaleHappened,
      updateAuthority:asset.metadata.updateAuthority,
      isMutable:asset.metadata.isMutable,
      rugCheck: false,
      };

    // Compute rugCheck
    tokenMetadata.rugCheck = !tokenMetadata.isMutable &&
                            !tokenMetadata.mintAuthority &&
                            !tokenMetadata.freezeAuthority;

    // Fetch off-chain metadata to get the image (if needed)
    if (asset.metadata.uri) {
      try {
        const response = await fetch(asset.metadata.uri);
        const offChainMetadata = await response.json() as OffChainMetadata;
        // If you want to include off-chain metadata, extend the interface and assign here
        // For example:
        tokenMetadata.image = offChainMetadata.image ?? '';
      } catch (error) {
        logger.error(`Failed to fetch off-chain metadata for mint ${mintAddress}: ${error}`);
      }
    }
  } catch (error) {
    logger.warn(`Failed to fetch on-chain metadata for mint ${mintAddress}, falling back to token list: ${error}`);
    // If asset not found or error occurs, fall back to Solana Labs Token List
    const tokenList = await tokenListPromise;
    const tokenInfo = tokenList.find(token => token.address === mintAddress);

    // console.log(`tokenInfo`, tokenInfo);

    if (tokenInfo) {
      tokenMetadata.name = tokenInfo.name ?? '';
      tokenMetadata.symbol = tokenInfo.symbol ?? '';
      tokenMetadata.uri = tokenInfo.logoURI ?? '';
      // Compute rugCheck based on available data
      tokenMetadata.rugCheck = !tokenMetadata.isMutable &&
                              !tokenMetadata.mintAuthority &&
                              !tokenMetadata.freezeAuthority;
    }
  }

  // Cache the metadata (expires in 1 hour)
  await redis.set(cacheKey, JSON.stringify(tokenMetadata), 'EX', 3600);

  return tokenMetadata;
}

// // Test function
// async function test(mint: string) {
//   try {
//     const data = await getTokenMetadata(mint);
//     console.log(data);
//   } catch (error) {
//     console.error(error);
//   }
// }

// const mint = '4mhXFeprt63UEC8vVnZ1hFWXGrhDeBPQQ9fkUBBxQTWe';
// test(mint);
