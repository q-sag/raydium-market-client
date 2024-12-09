import { Connection, PublicKey } from "@solana/web3.js";
import * as dotenv from "dotenv";

dotenv.config();

async function monitorAccountLogs() {
    // Counter variables
    let successCount = 0;
    let errorCount = 0;
    let startTime = new Date();
    
    // The public key we want to monitor
    const publicKey = new PublicKey("39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg");
    
    // Initialize connection with both HTTP and WebSocket endpoints
    const connection = new Connection(
        process.env.RPC_URL || "https://api.devnet.solana.com",
        {
            wsEndpoint: process.env.RPC_WSS || "wss://api.devnet.solana.com",
            commitment: "confirmed"
        }
    );

    console.log("Starting log monitor (Quicknode)...");

    // Subscribe to logs
    const subscriptionId = connection.onLogs(
        publicKey,
        (logs, ctx) => {
            if (logs.err) {
                errorCount++;
                console.error("\n=== New Error Transaction ===");
                console.error("Transaction Signature:", logs.signature);
                console.error("Error:", logs.err);
            } else {
                successCount++;
                console.log("\n=== New Successful Transaction ===");
                console.log("Transaction Signature:", logs.signature);
            }

            const runningTime = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
            console.log("\nStats:");
            console.log(`Running time: ${runningTime} seconds`);
            console.log(`Success count: ${successCount} (${(successCount/runningTime).toFixed(2)}/sec)`);
            console.log(`Error count: ${errorCount} (${(errorCount/runningTime).toFixed(2)}/sec)`);
            console.log(`Total: ${successCount + errorCount} (${((successCount + errorCount)/runningTime).toFixed(2)}/sec)`);
            console.log("==================\n");
        },
        "confirmed"
    );

    console.log(`Subscription ID: ${subscriptionId}`);
    console.log(`Monitoring logs for address: ${publicKey.toString()}`);

    // Keep the script running
    process.on('SIGINT', () => {
        console.log('\nFinal Stats:');
        const runningTime = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        console.log(`Total running time: ${runningTime} seconds`);
        console.log(`Total successful transactions: ${successCount}`);
        console.log(`Total error transactions: ${errorCount}`);
        console.log(`Total transactions: ${successCount + errorCount}`);
        console.log('\nClosing connection...');
        connection.removeOnLogsListener(subscriptionId);
        process.exit(0);
    });
}

// Run the monitor
monitorAccountLogs().catch(err => {
    console.error("Error in log monitor:", err);
    process.exit(1);
});
