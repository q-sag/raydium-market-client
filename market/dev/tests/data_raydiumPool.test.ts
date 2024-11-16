// src/index.ts

import { fetchRaydiumPoolData } from '../../fetch/raydium_fetchPoolData';
import { market_RaydiumPoolData } from '../../../utils/interfaces'

(async () => {
  try {
    const poolId = '7TkVaEEG8CpMutTpkQMGDEdsRi1GxnjA1NzKiTPKbxnE'; // Replace with your actual pool ID
    const liquidityDataJSON = await fetchRaydiumPoolData(poolId);

    console.log('Parsed Liquidity Account Data:', liquidityDataJSON);
    // console.log(liquidityDataJSON)
    // console.log(liquidityDataJSON.baseVault)
  } catch (error) {
    console.error('Error parsing liquidity account:', (error as Error).message, error.stack);
  }
})();
