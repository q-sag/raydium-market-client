import { error } from "console";
import { MarketClient } from "../../apiClient";

const market = new MarketClient();

async function testFetch(mint: string){
    try{
        const data = await market.getTokenMetadata(mint);
        console.log(data);
        if(data.rugCheck == true ){
            console.log(`passed`)
        }
    } catch {error};
}

const mint = 'C9TK5usJCVHr6qLsic1Mex7G39FJa4HT342LJ2Z8kuye';

testFetch(mint);