import { fetchClmmPoolData } from '../raydium_clmm copy 3';
import { sqrtPriceX64ToPrice } from '../../utils/utils';
const { Connection, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.mainnet-beta.solana.com');

async function main() {
  const poolId = 'AYf5abBGrwjz2n2gGP4YG91hJer22zakrizrRhddTehS'; // Replace with your desired Pool ID

  try {
    const accountInfo = await connection.getParsedAccountInfo(new PublicKey(poolId));
    const accountOwner = accountInfo.value.owner.toBase58();
    console.log(accountOwner)
    const clmm = await fetchClmmPoolData(poolId, accountInfo);

    console.log('--- CLMM Pool Info ---');
    console.log(JSON.stringify(clmm.pool, null, 2));

    const sqrtPriceX64 = clmm.pool.sqrtPriceX64; // Should be a string

    const decimalsA = clmm.pool.mintDecimalsA;
    const decimalsB = clmm.pool.mintDecimalsB;

    const price = sqrtPriceX64ToPrice(sqrtPriceX64, decimalsA, decimalsB);
    console.log(`Price of Token A in terms of Token B: ${price.toString()}`);
  } catch (error) {
    console.error('Error fetching CLMM pool data:', (error as Error).message, error.stack);
  }
}

main();
