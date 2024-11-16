import { error } from "console";
import { MarketClient } from "../../../api/marketAPI-client";

const market = new MarketClient();

async function testFetch(mint: string){
    try{
        const data = await market.getPumpTokenPrice(mint);
        console.log(data);
    } catch {error};
}

const mint = 'AWxdedosYmBUj5XKMfrZJH4cDaagFDGUdPEhePtUpump';

testFetch(mint);