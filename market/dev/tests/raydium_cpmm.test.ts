// example.ts

import { fetchCpmmPoolData, cpmmPoolDataForWS } from '../../fetch/raydium_cpmm';
const { Connection, PublicKey } = require('@solana/web3.js');
const connection = new Connection('https://api.mainnet-beta.solana.com');

async function main() {
  // Hardcoded CPMM Pool Public Key
  const poolId = 'AYf5abBGrwjz2n2gGP4YG91hJer22zakrizrRhddTehS'; // Replace with your desired Pool ID

  try {
    const accountInfo = await connection.getParsedAccountInfo(new PublicKey(poolId));
    const accountOwner = accountInfo.value.owner.toBase58();
    console.log(accountOwner)

    // Fetch and parse CPMM Pool Data
    const cpmmData = await fetchCpmmPoolData(poolId, accountInfo);

    // Display CPMM Config Info
    console.log('--- CPMM Config Info ---');
    console.log(JSON.stringify(cpmmData.config, null, 2));

    // Display CPMM Pool Info
    console.log('--- CPMM Pool Info ---');
    console.log(JSON.stringify(cpmmData.pool, null, 2));


    const poolData = await cpmmPoolDataForWS(cpmmData.pool);

    console.log(poolData);
  } catch (error) {
    console.error('Error fetching CPMM pool data:', (error as Error).message);
  }
}

// Execute the main function
main();

