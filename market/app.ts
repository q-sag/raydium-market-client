const { spawn } = require('child_process');
const path = require('path');

// Function to run a script
function runScript(scriptPath) {
    const script = spawn('ts-node', [path.resolve(scriptPath)], {
        stdio: 'inherit', // To output logs directly to the console
        shell: true
    });

    script.on('close', (code) => {
        console.log(`Script ${scriptPath} exited with code ${code}`);
    });

    script.on('error', (err) => {
        console.error(`Failed to start script ${scriptPath}:`, err);
    });

    return script;
}

// Initialize the scripts
console.log('Market Server initialized and scripts running...');
console.log('Booting Market API script...');
const apiScript = runScript('market/api.ts');

console.log('Booting Pump Migration Listener...');
const migration = runScript('market/websockets/migration_ws.pump.ts');

console.log('Booting Pump Price Websocket...');
const pump_price = runScript('market/websockets/price_ws.pump.ts');

console.log('Booting Raydium Price Websocket...');
const raydium_price = runScript('market/websockets/price_ws.AmmPool.ts');

// Example: Handle process exit
process.on('exit', () => {
    apiScript.kill();
    migration.kill();
    pump_price.kill();
    raydium_price.kill();
});

process.on('SIGINT', () => {
    console.log('Terminating scripts...');
    apiScript.kill();
    migration.kill();
    pump_price.kill();
    raydium_price.kill();
    process.exit();
});

// console.log('Server initialized and scripts running...');
