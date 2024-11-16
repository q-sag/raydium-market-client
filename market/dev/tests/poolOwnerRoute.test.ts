
import {
    Connection,
    PublicKey,
    clusterApiUrl,
  } from '@solana/web3.js';
  import * as dotenv from 'dotenv';
  import {RAYDIUM_CPMM_PROGRAM_ID, RAYDIUM_PROGRAM} from '../../utils/utils';
  // Initialize environment variables
  dotenv.config();
  
  // Configuration
  const RPC_URL = process.env.RPC_URL || clusterApiUrl('mainnet-beta');
  const connection = new Connection(RPC_URL, 'confirmed');
  

  async function getAccountOwner(pkey:any){

    const accountInfo = await connection.getParsedAccountInfo(pkey);
    console.log(accountInfo);

    const accountOwner = (accountInfo.value.owner).toBase58();
    console.log(accountOwner)

    if (accountOwner == RAYDIUM_CPMM_PROGRAM_ID) { 
      console.log(`CPMM`);
    } else if (accountOwner == RAYDIUM_PROGRAM) {
      console.log(`LiquidityPool`);
    }
  }

const accountKey = new PublicKey('F9pQ3Lx33yd29CnEjSTkjwukrHtTUNe2qZD1ZkD86f4X');
getAccountOwner(accountKey);

