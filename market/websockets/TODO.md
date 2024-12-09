we're not catching some of the logs from the pump migration

>>> migration_ws.pump.ts
Example token : D8ZqHuacdwZNa7yYaUKn4np3q4LeHFfktXr1HJPppump

Eample Withdraw :
https://solscan.io/tx/4BfwUJ5DLGY4Fa3m5GPCojVy1FjNNfKjDSCFG78DZ9VTHVJMfAWAaSPApF7CzGcaCPz16U5Cba84Wwa1PHgiXGL2

example missing transaction : 
https://solscan.io/tx/3cj6a7qzWyjoc6nzA5C7gJt85eX2UxxYmXQjencpZPzL6kLAiXZivKcvjMXpF8TRVYKEzG1n57jz2XUPpTF5gGfy


issue : 
seems like some of the transaction signatures are not being caught by the websocket.

WHY ?  

in SOLSCAN, the transaction is appearing in DEFI tab but not in the transaction tab.: 
https://solscan.io/account/39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg

Missing on both My transactions received thorugh websocket and on SOLSCAN tab Transactions.

But for some reason its appearing in DEFI tab.


Similar issue described here : 
https://solana.stackexchange.com/questions/18100/transactions-missing-while-monitoring-multiple-wallets-with-onlogs

https://github.com/solana-labs/solana/issues/24536


@solana/web3.js@2.0.0 has replaced onLogs with logsSubscribe method.


quicknode : migration_wsV2.Quicknode.test.ts

=== New Successful Transaction ===
Transaction Signature: 2ToQATn6fW8hCsHExTWLDhhgztAWHErMCBpXSuDE8Qqqai6j2Yf5KSAqP7poD1x9sjemDHAWLJkrsyJ6ryQi5XN2

Stats:
Running time: 75 seconds
Success count: 1 (0.01/sec)
Error count: 0 (0.00/sec)
Total: 1 (0.01/sec)
==================


=== New Successful Transaction ===
Transaction Signature: 63FCX3SQBR53iaKpxbaAbsbf32VfjhCVysV2aacKPHKLUWu9JEwcP2u55riVPoYkEUp4PdtxnNctujpLD7mZQ3Pg

Stats:
Running time: 105 seconds
Success count: 2 (0.02/sec)
Error count: 0 (0.00/sec)
Total: 2 (0.02/sec)
==================

Helius : migration_wsV2.Helius.test.ts

=== New Successful Transaction ===
Transaction Signature: 2ToQATn6fW8hCsHExTWLDhhgztAWHErMCBpXSuDE8Qqqai6j2Yf5KSAqP7poD1x9sjemDHAWLJkrsyJ6ryQi5XN2

Stats:
Running time: 59 seconds
Success count: 1 (0.02/sec)
Error count: 0 (0.00/sec)
Total: 1 (0.02/sec)
==================


=== New Successful Transaction ===
Transaction Signature: 63FCX3SQBR53iaKpxbaAbsbf32VfjhCVysV2aacKPHKLUWu9JEwcP2u55riVPoYkEUp4PdtxnNctujpLD7mZQ3Pg

Stats:
Running time: 89 seconds
Success count: 2 (0.02/sec)
Error count: 0 (0.00/sec)
Total: 2 (0.02/sec)
==================

Even after switching to helius, the issue persists. How to fix this ? 

>> Potential Solution : 

1. Use both websockets from quicknode and helius to subscribe to the same account. 
2. Skip Duplicate transactions based on signature.
3. Use existing logic to check if the transaction is a migration transaction.
4. Add logic to record transaction details in Postgres. Create table migration_transactions.
5. Add logic to keep track of migration flow. is_complete Boolean flag to check if the migration is complete. If withdraw is detected, set the flag to false. If add is detected, set the flag to true. Each migration transaction should have a unique signature. Each migration bundle should be indexed by the mint address of the token parsed from the transaction.
6. Add logic to print warnings for migration events that have unmatched withdraw or add events after 30 minutes from withdraw event for token.


>> Another Potential Solution :  commitment level change from confirmed to processed.


>> Other issues : 
transaction : 
4fF7AUubxqmSHpPrAYGQB3ZJagWZvQArxsoYBia7BfLXaxGJvSTcyrwVbeXVjUg3g6ivts1twELuKJ2jGxxvt5j7

wasn't able to parse transaction details. 

