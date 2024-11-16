const RAYDIUM_PROGRAM_IDS = {
  STANDARD_AMM: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  OPENBOOK_AMM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  STABLE_SWAP_AMM: '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h',
  CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
};

- CLMM: 
2AXXcN6oN9bBT5owwmTH53C7QHUXvhLeu718Kqt8rvY2 
7ccc6q1L9QAdzm6Aq1wpGiFZN4jbEe5TV9NaDNyhbf6X
vkJvn7k21er2Ype8CjBjasMmfU5cYtJQpxVYXrdHuJJ


- STANDARD_AMM :
DejjfNoAEZUNuspN2oHzyH6B4F9HuXPx8PPujfjSC6QN
HsdKUVw359tBgpNswGfubhwf56mz31UE2Z9AiAhYqAKm
Gpoo3mozGucevas25aRojzxdNcUonX4kSU8o1i4wjNd

- OPENBOOK_AMM : 
271hxbR1Tv8z94eFPe7JcV9kEVgBW3TA8wwbpqsBeJkW
HmSDpiJw7dwymh4UCohZT6PwwXUEZzhzSDouSHKdL94K
DW9kiyzs78gmVoTMFcW7YH1jBYDYM5ATvpWkDj5CnrU

- STABLE_SWAP_AMM : 
7MNfSggpTRM5uLSrKPwgTKLpxwYoqy9piHiuRFrV6Yhi
AYf5abBGrwjz2n2gGP4YG91hJer22zakrizrRhddTehS
9DTY3rv8xRa3CnoPoWJCMcQUSY7kUHZAoFKNsBhx8DDz

# Market MS Responses : 
## CLMM: 
#### 2AXXcN6oN9bBT5owwmTH53C7QHUXvhLeu718Kqt8rvY2 
CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK
Parsed Liquidity Account Data: {
  owner: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  pool: {
    bump: 254,
    ammConfig: 'HfERMT5DRA6C1TAqecrJQFpmkf3wsWTMncqnj3RDg5aw',
    creator: '57e9WjTwt6S6XJFartPW8GQmGVP9bwz215CYzKvcEgTG',
    mintA: 'So11111111111111111111111111111111111111112',
    mintB: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    vaultA: '9Jgp8NpqEDFd5d3RQPfuRY7gMgRFByTNFmi68Ph1yvVb',
    vaultB: 'Be1CFyoPAr8aBGxpvCPD2LD21hdz2vjYNq8EcypnmgGD',
    observationId: 'DCURDhS5do6w9EytNmFxUNp3kYqXxfkv61Gs7FtLcH5a',
    mintDecimalsA: 9,
    mintDecimalsB: 6,
    tickSpacing: 10,
    liquidity: '10618244506913', **Sol IN LAMPORTS IN TRADING POOL** 
    sqrtPriceX64: '3599832535222676085',
    tickCurrent: ##32682,
    feeProtocol: 0,
    feeGrowthGlobalX64A: '4187897781798870892',
    feeGrowthGlobalX64B: '351453173619704831',
    protocolFeesTokenA: '48494080',
    protocolFeesTokenB: '2303361',
    swapInAmountTokenA: '3843853249128282',
    swapOutAmountTokenB: '312360166521689',
    swapInAmountTokenB: '311061047914960',
    swapOutAmountTokenA: '3819403596780372',
    status: 0,
    rewardInfos: [ [Object], [Object], [Object] ],
    tickArrayBitmap: [
      '0',                    '0',
      '0',                    '0',
      '0',                    '0',
      '0',                    '0',
      '0',                    '3678099638428106752',
      '15454184448725077504', '13741848325631848182',
      '2054547732988548847',  '13083130',
      '0',                    '0'
    ],
    totalFeesTokenA: '0',
    totalFeesClaimedTokenA: '4611686018427387904',
    totalFeesTokenB: '0',
    totalFeesClaimedTokenB: '0',
    fundFeesTokenA: '0',
    fundFeesTokenB: '9511602447366225920',
    startTime: '4611686018427144192'
  }
}


#### 7ccc6q1L9QAdzm6Aq1wpGiFZN4jbEe5TV9NaDNyhbf6X **HANDLE DEAD POOLS**
CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK
Error parsing liquidity account: Failed to parse liquidity account: Failed to fetch CLMM pool data: RangeError: The value of "offset" is out of range. It must be >= 0 and <= 224. Received 233
    at boundsError (node:internal/buffer:88:9)
    at Buffer.readUInt8 (node:internal/buffer:254:5)
    at Buffer.readUIntLE (node:internal/buffer:184:17)
    at UInt.decode (c:\Users\falcon9\Documents\GitHub\ats##engine\node_modules\buffer##layout\lib\Layout.js:570:14)
    at Structure.decode (c:\Users\falcon9\Documents\GitHub\ats##engine\node_modules\buffer##layout\lib\Layout.js:1234:32)
    at deserializeClmmPoolInfo (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_clmm.ts:317:38)
    at fetchClmmPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_clmm.ts:437:22)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async fetchRaydiumPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_fetchPoolData.ts:377:24)
    at async c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\tests\data_raydiumPool.test.ts:9:31 Error: Failed to parse liquidity account: Failed to fetch CLMM pool data: RangeError: The value of "offset" is out of range. It must be >= 0 and <= 224. Received 233
    at boundsError (node:internal/buffer:88:9)
    at Buffer.readUInt8 (node:internal/buffer:254:5)
    at Buffer.readUIntLE (node:internal/buffer:184:17)
    at UInt.decode (c:\Users\falcon9\Documents\GitHub\ats##engine\node_modules\buffer##layout\lib\Layout.js:570:14)
    at Structure.decode (c:\Users\falcon9\Documents\GitHub\ats##engine\node_modules\buffer##layout\lib\Layout.js:1234:32)
    at deserializeClmmPoolInfo (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_clmm.ts:317:38)
    at fetchClmmPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_clmm.ts:437:22)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async fetchRaydiumPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_fetchPoolData.ts:377:24)
    at async c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\tests\data_raydiumPool.test.ts:9:31
    at fetchRaydiumPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_fetchPoolData.ts:387:11)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\tests\data_raydiumPool.test.ts:9:31

#### vkJvn7k21er2Ype8CjBjasMmfU5cYtJQpxVYXrdHuJJ **HANDLE DEAD POOLS**
CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK
Error parsing liquidity account: Failed to parse liquidity account: Failed to fetch CLMM pool data: RangeError: The value of "offset" is out of range. It must be >= 0 and <= 224. Received 233
    at boundsError (node:internal/buffer:88:9)
    at Buffer.readUInt8 (node:internal/buffer:254:5)
    at Buffer.readUIntLE (node:internal/buffer:184:17)
    at UInt.decode (c:\Users\falcon9\Documents\GitHub\ats##engine\node_modules\buffer##layout\lib\Layout.js:570:14)
    at Structure.decode (c:\Users\falcon9\Documents\GitHub\ats##engine\node_modules\buffer##layout\lib\Layout.js:1234:32)
    at deserializeClmmPoolInfo (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_clmm.ts:317:38)
    at fetchClmmPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_clmm.ts:437:22)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async fetchRaydiumPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_fetchPoolData.ts:377:24)
    at async c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\tests\data_raydiumPool.test.ts:9:31 Error: Failed to parse liquidity account: Failed to fetch CLMM pool data: RangeError: The value of "offset" is out of range. It must be >= 0 and <= 224. Received 233
    at boundsError (node:internal/buffer:88:9)
    at Buffer.readUInt8 (node:internal/buffer:254:5)
    at Buffer.readUIntLE (node:internal/buffer:184:17)
    at UInt.decode (c:\Users\falcon9\Documents\GitHub\ats##engine\node_modules\buffer##layout\lib\Layout.js:570:14)
    at Structure.decode (c:\Users\falcon9\Documents\GitHub\ats##engine\node_modules\buffer##layout\lib\Layout.js:1234:32)
    at deserializeClmmPoolInfo (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_clmm.ts:317:38)
    at fetchClmmPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_clmm.ts:437:22)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async fetchRaydiumPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_fetchPoolData.ts:377:24)
    at async c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\tests\data_raydiumPool.test.ts:9:31
    at fetchRaydiumPoolData (c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\fetch\raydium_fetchPoolData.ts:387:11)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async c:\Users\falcon9\Documents\GitHub\ats##engine\src\market\tests\data_raydiumPool.test.ts:9:31

## STANDARD_AMM :
#### DejjfNoAEZUNuspN2oHzyH6B4F9HuXPx8PPujfjSC6QN
Parsed Liquidity Account Data: {
  owner: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  pool: {
    configId: '5rF6Ep4Qo9Z8jBUi7BTvS8LdDb2pwr73s1izYsqFpXc',
    poolCreator: '9kD97Dp8xC2hiAmxz9wUS5oiKZjG7RdNNjXHZDUy8Q2K',
    vaultA: '111111111117gC8CyeUumYBHNgwyCddVgEjNC6hu',
    vaultB: '1112GkEFrJ8k9Tu2JtmA1ZMHk3NwFfe7gRcAMYLywYr',
    mintLp: 'CEPBLFxiAjJYujBj8hBDPfd8erEG5PN4siDT5m6APCBH',
    mintA: '1119oiaEDp4brdivEV4Kgk1FjCLU3WkdZonDS55iqps',
    mintB: '1118k6exkbo7o2yGkKerBsULQ7ecyZKwfWPQ2X9Uodh',
    mintProgramA: '11111111111CnDJg86YZEwsVo7cuvwy4xnK58kxf',
    mintProgramB: '111BdKBGXq1hbBqpEvcyDs6zdRsQsuHPkjggww3jSVT',
    observationId: 'D5F37xPzMsbNWexnNKBFt8sL59ZsezVXd7Mia5NcXrWB',
    bump: 0,
    status: 0,
    lpDecimals: 0,
    mintDecimalA: 28,
    mintDecimalB: 177,
    lpAmount: '783676287029502',
    protocolFeesMintA: '1928666540421414912',
    protocolFeesMintB: '0',
    fundFeesMintA: '10444973435779022848',
    fundFeesMintB: '6309543077946091310',
    openTime: '870660207977134',
    additionalData: [
      '2222526416107339776',  '0',
      '10449477035406393344', '16636297023506638638',
      '958889498238745',      '2452209997103235072',
      '0',                    '10461580459404951552',
      '16281357077874501422', '1197454459799610',
      '3057381197031145472',  '0',
      '10468054383869296640', '4102216310581126958',
      '1329550694356545',     '3374603495784054784',
      '0',                    '10472557983496667136',
      '13447185537374906158', '1417109837741686',
      '3604287076779950080',  '0',
      '10481283707774697472', '15050467004718802734',
      '1599815459775310',     '4014396117847375872',
      '0',                    '10490853856982859776',
      '3454823864146618158',  '1784408430538275',
      '4502473727463653376',  '0'
    ]
  }
}

#### HsdKUVw359tBgpNswGfubhwf56mz31UE2Z9AiAhYqAKm
Parsed Liquidity Account Data: {
  owner: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  pool: {
    configId: 'D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2',
    poolCreator: 'jbU8CGdYBsNt64HaKw89a4PAyJ5johJxeukoqVPL4Wi',
    vaultA: 'DypR44AJk9Xud8q4WWERZ82wd4QEC2G5WDi9Va3GiaS',
    vaultB: 'B9eTW1EP7Mkpjf6BGL7yeK2dSsQJg2SqVXiPbitGaJw5',
    mintLp: 'BgFQmb6vn63hVgqnWdpeCmZP1P7k4Kzfz4yraTddz154',
    mintA: 'So11111111111111111111111111111111111111112',
    mintB: 'ARWkEozFyZR553b3dDX3Kgy31DaGUP6ikiB7C9t9mdNn',
    mintProgramA: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    mintProgramB: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    observationId: 'Hpqcv7S6s8pXuaJcrFErG7MZPNMQ9DLs86cmcp1TdZ8k',
    bump: 253,
    status: 0,
    lpDecimals: 9,
    mintDecimalA: 9,
    mintDecimalB: 6,
    lpAmount: '100',
    protocolFeesMintA: '28767876',
    protocolFeesMintB: '34151774',
    fundFeesMintA: '9589292',
    fundFeesMintB: '11383924',
    openTime: '1724497204',
    additionalData: [
      '661', '0', '0', '0', '0', '0',
      '0',   '0', '0', '0', '0', '0',
      '0',   '0', '0', '0', '0', '0',
      '0',   '0', '0', '0', '0', '0',
      '0',   '0', '0', '0', '0', '0',
      '0',   '0'
    ]
  }
}

#### Gpoo3mozGucevas25aRojzxdNcUonX4kSU8o1i4wjNd
Parsed Liquidity Account Data: {
  owner: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  pool: {
    configId: '5U8fUm1u2RVwHnCm3LADXPEdigrRVL5L7odoioSfqvc',
    poolCreator: 'Cte8B6aQ7JDfzR1DEvBgUPm82b8RzbAYFxn4JVcdbmXM',
    vaultA: '111111111117F9GpseBpWz16EqThnQbGrBg8g53M',
    vaultB: '1111JNaZk8mn5eCoinLKPuzkZDGzBK3sYNzvpRwZ8M',
    mintLp: '8xrkDg1ngSSdNAEpusrd1KkLTVpnWXZNdCwhXXSdf7yh',
    mintA: '111XWg9tnio59zL514ydtN66igv1HcFcAbBKxbPZh1',
    mintB: '111A4PpvVpUU4tax62wL7uokbNp9YuaW2ie4Q6M4w2P',
    mintProgramA: '11111111111Fyb3zHBVwKt7epAq1LjCsUALNYJNK',
    mintProgramB: '111Bu6cpAzcJH6TSrwrR6S6gBsLZ4Ykv1XAq5MWScQp',
    observationId: '6bd6yQzpHCH5vKB9DEk4wqX12Gfjk7VFAdiE3YCgEWNK',
    bump: 0,
    status: 0,
    lpDecimals: 0,
    mintDecimalA: 72,
    mintDecimalB: 196,
    lpAmount: '1702193993142',
    protocolFeesMintA: '13797058933426225152',
    protocolFeesMintB: '236',
    fundFeesMintA: '10094537089774256128',
    fundFeesMintB: '10405848414016268078',
    openTime: '2738288946991',
    additionalData: [
      '11139090728347500544', '349',
      '10102418389122154496', '13200331982799660846',
      '2914076766848',        '14001128291541450752',
      '368',                  '10107484938702946304',
      '9889060356775503662',  '2914635539457',
      '3000523251735592960',  '2859',
      '10140698985954803712', '2015642308225034030',
      '2918904907600',        '11989708107967102976',
      '16866',                '10149143235256123392',
      '16543128806215411502', '3107467528468',
      '2758454771764428800',  '16887',
      '10155617159720468480', '15447909671834249006',
      '3111624587134',        '12885924433813831680',
      '17433',                '10164342883998498816',
      '9393382922788038446',  '3117899368432',
      '8937956410470170624',  '18091'
    ]
  }
}

## OPENBOOK_AMM : 
#### 271hxbR1Tv8z94eFPe7JcV9kEVgBW3TA8wwbpqsBeJkW
Parsed Liquidity Account Data: {
  owner: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  pool: {
    status: '6',
    nonce: '254',
    maxOrder: '7',
    depth: '3',
    baseDecimal: 9,
    quoteDecimal: 9,
    state: '2',
    minSize: '100000000',
    volMaxCutRatio: '500',
    amountWaveRatio: '5000000',
    baseLotSize: '100000000',
    quoteLotSize: '100000000',
    minPriceMultiplier: '1',
    maxPriceMultiplier: '1000000000',
    systemDecimalValue: '1000000000',
    minSeparateNumerator: '5',
    minSeparateDenominator: '10000',
    tradeFeeNumerator: '25',
    tradeFeeDenominator: '10000',
    pnlNumerator: '12',
    pnlDenominator: '100',
    swapFeeNumerator: '25',
    swapFeeDenominator: '10000',
    baseNeedTakePnl: '243684787483215',
    quoteNeedTakePnl: '2735530',
    quoteTotalPnl: '22796085',
    baseTotalPnl: '2030706562360129',
    poolOpenTime: '1703202154',
    punishPcAmount: '0',
    punishCoinAmount: '0',
    orderbookToInitTime: '0',
    swapBaseInAmount: '809887676656573338',
    swapQuoteOutAmount: '22176566180',
    swapBase2QuoteFee: '56585653',
    swapQuoteInAmount: '22634261020',
    swapBaseOutAmount: '848128927923680678',
    swapQuote2BaseFee: '2024719191641444',
    baseVault: 'AZmMkRUBFWa11xVu2YcMrTcdhMhoWAqAeskQkWKmKopv',
    quoteVault: '3KkgLsh4Z3v1cDjado1NREqyzoEZo9Jo7zg9znVunvae',
    baseMint: 'B9wfHoTQc3DGy4i2geztqQFru43vPcbAH2JHUbVguJDD',
    quoteMint: 'So11111111111111111111111111111111111111112',
    lpMint: '9XdWHQdwU9X5ooHQX8kYYqPUN76wtFfoMDKg66FCcDP5',
    openOrders: 'J4Wj4rcZn6GfwC2ZdaQskk1nzPzQY7kbQx3CKfDvydUt',
    marketId: '4PNmznqcc3ihDNLEhK3PhBq1NZqpHfzvRmHZR3iD1GWG',
    marketProgramId: 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
    targetOrders: '3WLJh8y28Gex7bxQ8zzayscdZpEkTPBmtVR3TK9Fq1uQ',
    withdrawQueue: '11111111111111111111111111111111',
    lpVault: '11111111111111111111111111111111',
    lpReserve: '12014825125656114917'
  }
}

#### HmSDpiJw7dwymh4UCohZT6PwwXUEZzhzSDouSHKdL94K
Parsed Liquidity Account Data: {
  owner: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  pool: {
    status: '15688303887424103074',
    nonce: '12881820776706382176',
    maxOrder: '11044074894466404937',
    depth: '6495439859600719630',
    baseDecimal: 0,
    quoteDecimal: 0,
    state: '0',
    minSize: '0',
    volMaxCutRatio: '0',
    amountWaveRatio: '0',
    baseLotSize: '0',
    quoteLotSize: '0',
    minPriceMultiplier: '0',
    maxPriceMultiplier: '0',
    systemDecimalValue: '0',
    minSeparateNumerator: '0',
    minSeparateDenominator: '0',
    tradeFeeNumerator: '0',
    tradeFeeDenominator: '0',
    pnlNumerator: '0',
    pnlDenominator: '0',
    swapFeeNumerator: '0',
    swapFeeDenominator: '0',
    baseNeedTakePnl: '0',
    quoteNeedTakePnl: '0',
    quoteTotalPnl: '0',
    baseTotalPnl: '0',
    poolOpenTime: '0',
    punishPcAmount: '0',
    punishCoinAmount: '0',
    orderbookToInitTime: '0',
    swapBaseInAmount: '0',
    swapQuoteOutAmount: '0',
    swapBase2QuoteFee: '0',
    swapQuoteInAmount: '0',
    swapBaseOutAmount: '0',
    swapQuote2BaseFee: '0',
    baseVault: '11111111111111111111111111111111',
    quoteVault: '11111111111111111111111111111111',
    baseMint: '11111111111111111111111111111111',
    quoteMint: '11111111111111111111111111111111',
    lpMint: '11111111111111111111111111111111',
    openOrders: '11111111111111111111111111111111',
    marketId: '11111111111111111111111111111111',
    marketProgramId: '11111111111111111111111111111111',
    targetOrders: '11111111111111111111111111111111',
    withdrawQueue: '11111111111111111111111111111111',
    lpVault: '11111111111111111111111111111111',
    lpReserve: '0'
  }
}

#### DW9kiyzs78gmVoTMFcW7YH1jBYDYM5ATvpWkDj5CnrU
Parsed Liquidity Account Data: {
  owner: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  pool: {
    status: '6',
    nonce: '254',
    maxOrder: '7',
    depth: '3',
    baseDecimal: 6,
    quoteDecimal: 9,
    state: '1',
    minSize: '1000000000',
    volMaxCutRatio: '500',
    amountWaveRatio: '5000000',
    baseLotSize: '1000000',
    quoteLotSize: '10000',
    minPriceMultiplier: '1',
    maxPriceMultiplier: '1000000000',
    systemDecimalValue: '1000000000',
    minSeparateNumerator: '5',
    minSeparateDenominator: '10000',
    tradeFeeNumerator: '25',
    tradeFeeDenominator: '10000',
    pnlNumerator: '12',
    pnlDenominator: '100',
    swapFeeNumerator: '25',
    swapFeeDenominator: '10000',
    baseNeedTakePnl: '0',
    quoteNeedTakePnl: '0',
    quoteTotalPnl: '0',
    baseTotalPnl: '0',
    poolOpenTime: '1728080790',
    punishPcAmount: '0',
    punishCoinAmount: '0',
    orderbookToInitTime: '0',
    swapBaseInAmount: '867793922224473',
    swapQuoteOutAmount: '3674366339180',
    swapBase2QuoteFee: '9185188864',
    swapQuoteInAmount: '3674075539563',
    swapBaseOutAmount: '510934926944836',
    swapQuote2BaseFee: '2169484806795',
    baseVault: 'BAcSS1i4fEGrqStrrRDHA4uZGXYzrm4KtumeqmFmp4Jw',
    quoteVault: 'E7qgibawiEWgkvBeC6EqTMhF2Wvgn8EHnTjg9xzKuG8s',
    baseMint: 'EtAduB7TFZ4yEQSubksWz2QMaPsGJuyvH8Tkgox3pump',
    quoteMint: 'So11111111111111111111111111111111111111112',
    lpMint: 'F8ACLNTsiRGzELjHLrVEMx5MpZFtFjqJ9jpyzNL7Kska',
    openOrders: 'FLpPqMW2BVxG4PsZPpWuNirctE5TihxngVpyQ57vqn3P',
    marketId: 'JCSbHjdkww4s17iUadDkcrDrjsQZCoJFtmqycBmDMXPG',
    marketProgramId: 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
    targetOrders: '2fAgMVmuRWb1X6xQzKnpWUDSsdZKpV2vgqymedsMmg2e',
    withdrawQueue: '11111111111111111111111111111111',
    lpVault: '11111111111111111111111111111111',
    lpReserve: '12014825125656114917'
  }
}
## STABLE_SWAP_AMM : 
#### 7MNfSggpTRM5uLSrKPwgTKLpxwYoqy9piHiuRFrV6Yhi
Error parsing liquidity account: Failed to parse liquidity account: Unsupported pool owner: 5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h Error: Failed to parse liquidity account: Unsupported pool owner: 5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h
    at fetchRaydiumPoolData (c:\Users\falcon9\Documents\GitHub\ats-engine\src\market\fetch\raydium_fetchPoolData.ts:387:11)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async c:\Users\falcon9\Documents\GitHub\ats-engine\src\market\tests\data_raydiumPool.test.ts:9:31

#### AYf5abBGrwjz2n2gGP4YG91hJer22zakrizrRhddTehS


#### 9DTY3rv8xRa3CnoPoWJCMcQUSY7kUHZAoFKNsBhx8DDz

# Raydium API Responses : 
Raydium API accepts multiple Pools in one query, but there is no info about limit. We need to test it by sending different amounts of pools in one request. 
As well there is no information about Rate Limits. We need to find out by making requests and defining rate-limit.


Request URL
https://api-v3.raydium.io/pools/info/ids?ids={POOL_ID,POOL_ID,....}

## CLMM: 
#### 2AXXcN6oN9bBT5owwmTH53C7QHUXvhLeu718Kqt8rvY2 
{
  "id": "1dd92d0a-bad9-4114-ad62-6576685cb988",
  "success": true,
  "data": [
    {
      "type": "Concentrated",
      "programId": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
      "id": "2AXXcN6oN9bBT5owwmTH53C7QHUXvhLeu718Kqt8rvY2",
      "mintA": {
        "chainId": 101,
        "address": "So11111111111111111111111111111111111111112",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/So11111111111111111111111111111111111111112.png",
        "symbol": "WSOL",
        "name": "Wrapped SOL",
        "decimals": 9,
        "tags": [],
        "extensions": {}
      },
      "mintB": {
        "chainId": 101,
        "address": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R.png",
        "symbol": "RAY",
        "name": "Raydium",
        "decimals": 6,
        "tags": [],
        "extensions": {}
      },
      "rewardDefaultPoolInfos": "Clmm",
      "rewardDefaultInfos": [
        {
          "mint": {
            "chainId": 101,
            "address": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            "logoURI": "https://img-v1.raydium.io/icon/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R.png",
            "symbol": "RAY",
            "name": "Raydium",
            "decimals": 6,
            "tags": [],
            "extensions": {}
          },
          "perSecond": "827",
          "startTime": "1729074600",
          "endTime": "1735122600"
        }
      ],
      "price": 36.37069328781381,
      "mintAmountA": 10609.018812976,
      "mintAmountB": 124495.327056,
      "feeRate": 0.0005,
      "openTime": "0",
      "tvl": 2775159.6,
      "day": {
        "volume": 31736987.749155324,
        "volumeQuote": 5973002.064772177,
        "volumeFee": 15868.493874577647,
        "apr": 213.80571968058473,
        "feeApr": 208.71,
        "priceMin": 33.66721551395933,
        "priceMax": 42.6278691240674,
        "rewardApr": [
          5.0957196805847325
        ]
      },
      "week": {
        "volume": 119651432.19184013,
        "volumeQuote": 28455565.33570388,
        "volumeFee": 59825.716095920056,
        "apr": 69.76571968058474,
        "feeApr": 64.67,
        "priceMin": 33.66721551395933,
        "priceMax": 53.399688712559794,
        "rewardApr": [
          5.0957196805847325
        ]
      },
      "month": {
        "volume": 304369713.7491248,
        "volumeQuote": 95967548.667534,
        "volumeFee": 152184.85687456236,
        "apr": 70.90571968058474,
        "feeApr": 65.81,
        "priceMin": 33.66721551395933,
        "priceMax": 86.29010959806584,
        "rewardApr": [
          5.0957196805847325
        ]
      },
      "pooltype": [],
      "farmUpcomingCount": 0,
      "farmOngoingCount": 1,
      "farmFinishedCount": 0,
      "config": {
        "id": "HfERMT5DRA6C1TAqecrJQFpmkf3wsWTMncqnj3RDg5aw",
        "index": 2,
        "protocolFeeRate": 120000,
        "tradeFeeRate": 500,
        "tickSpacing": 10,
        "fundFeeRate": 40000,
        "defaultRange": 0.1,
        "defaultRangePoint": [
          0.01,
          0.05,
          0.1,
          0.2,
          0.5
        ]
      },
      "burnPercent": 0.03
    }
  ]
}

#### 7ccc6q1L9QAdzm6Aq1wpGiFZN4jbEe5TV9NaDNyhbf6X
{
  "id": "36b69e56-9daf-4ec1-80e4-e9afc88fabb7",
  "success": true,
  "data": [
    null
  ]
}

#### vkJvn7k21er2Ype8CjBjasMmfU5cYtJQpxVYXrdHuJJ
{
  "id": "3e6e84bd-88f1-4ff8-a0ee-bd0d5c38355c",
  "success": true,
  "data": [
    null
  ]
}

## STANDARD_AMM :
#### DejjfNoAEZUNuspN2oHzyH6B4F9HuXPx8PPujfjSC6QN
{
  "id": "290d7dd9-e071-4ec7-bb12-3abc9b583a3c",
  "success": true,
  "data": [
    null
  ]
}

#### HsdKUVw359tBgpNswGfubhwf56mz31UE2Z9AiAhYqAKm
{
  "id": "467eafb8-b1d5-4389-8519-bc931ff5f55f",
  "success": true,
  "data": [
    {
      "programId": "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
      "id": "HsdKUVw359tBgpNswGfubhwf56mz31UE2Z9AiAhYqAKm",
      "mintA": {
        "chainId": 101,
        "address": "So11111111111111111111111111111111111111112",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/So11111111111111111111111111111111111111112.png",
        "symbol": "WSOL",
        "name": "Wrapped SOL",
        "decimals": 9,
        "tags": [],
        "extensions": {}
      },
      "mintB": {
        "chainId": 101,
        "address": "ARWkEozFyZR553b3dDX3Kgy31DaGUP6ikiB7C9t9mdNn",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/ARWkEozFyZR553b3dDX3Kgy31DaGUP6ikiB7C9t9mdNn.png",
        "symbol": "KORAT",
        "name": "Korat World",
        "decimals": 6,
        "tags": [
          "hasFreeze"
        ],
        "extensions": {}
      },
      "openTime": "1724497204",
      "vault": {
        "A": "DypR44AJk9Xud8q4WWERZ82wd4QEC2G5WDi9Va3GiaS",
        "B": "B9eTW1EP7Mkpjf6BGL7yeK2dSsQJg2SqVXiPbitGaJw5"
      },
      "authority": "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL",
      "config": {
        "id": "D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2",
        "index": 0,
        "protocolFeeRate": 120000,
        "tradeFeeRate": 2500,
        "fundFeeRate": 40000,
        "createPoolFee": "150000000"
      },
      "mintLp": {
        "chainId": 101,
        "address": "BgFQmb6vn63hVgqnWdpeCmZP1P7k4Kzfz4yraTddz154",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "",
        "symbol": "",
        "name": "",
        "decimals": 9,
        "tags": [],
        "extensions": {}
      }
    }
  ]
}

#### Gpoo3mozGucevas25aRojzxdNcUonX4kSU8o1i4wjNd
{
  "id": "81c6bc71-097e-4aba-9872-84b03b20e2f0",
  "success": true,
  "data": [
    null
  ]
}
## OPENBOOK_AMM : 
#### 271hxbR1Tv8z94eFPe7JcV9kEVgBW3TA8wwbpqsBeJkW
{
  "id": "203324e6-d5b9-4eda-878a-b266c46ce5f5",
  "success": true,
  "data": [
    {
      "programId": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
      "id": "271hxbR1Tv8z94eFPe7JcV9kEVgBW3TA8wwbpqsBeJkW",
      "mintA": {
        "chainId": 101,
        "address": "B9wfHoTQc3DGy4i2geztqQFru43vPcbAH2JHUbVguJDD",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/B9wfHoTQc3DGy4i2geztqQFru43vPcbAH2JHUbVguJDD.png",
        "symbol": "RUG",
        "name": "RUG",
        "decimals": 9,
        "tags": [],
        "extensions": {}
      },
      "mintB": {
        "chainId": 101,
        "address": "So11111111111111111111111111111111111111112",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/So11111111111111111111111111111111111111112.png",
        "symbol": "WSOL",
        "name": "Wrapped SOL",
        "decimals": 9,
        "tags": [],
        "extensions": {}
      },
      "lookupTableAccount": "2shcnAcDQSs71jLF3oMBvEW5FmhCbhjq8Ed3Fpw6VCZ8",
      "openTime": "1703202154",
      "vault": {
        "A": "AZmMkRUBFWa11xVu2YcMrTcdhMhoWAqAeskQkWKmKopv",
        "B": "3KkgLsh4Z3v1cDjado1NREqyzoEZo9Jo7zg9znVunvae"
      },
      "authority": "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
      "openOrders": "J4Wj4rcZn6GfwC2ZdaQskk1nzPzQY7kbQx3CKfDvydUt",
      "targetOrders": "3WLJh8y28Gex7bxQ8zzayscdZpEkTPBmtVR3TK9Fq1uQ",
      "mintLp": {
        "chainId": 101,
        "address": "9XdWHQdwU9X5ooHQX8kYYqPUN76wtFfoMDKg66FCcDP5",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "",
        "symbol": "",
        "name": "",
        "decimals": 9,
        "tags": [],
        "extensions": {}
      },
      "marketProgramId": "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX",
      "marketId": "4PNmznqcc3ihDNLEhK3PhBq1NZqpHfzvRmHZR3iD1GWG",
      "marketAuthority": "BKN49LS7tzxoJyUhHGoRkiGmsowcztuHBSV8K3uCou33",
      "marketBaseVault": "BuNqPBbAgyZWEATvB9JPoJjba7k6534Hc76QxBbNCQAG",
      "marketQuoteVault": "CaDqRHuzJYeBRtrsMcAMzF4ec8YWT3aB5e8Ng2NxZBsy",
      "marketBids": "Fs1sfkyXySXej5ZJoHUWo66Eor2AB1P9FvZHFtrkAJFZ",
      "marketAsks": "HiJvPJktcAouGmwKC9ea3AuMDXfpU68HdHe8PivrMnN7",
      "marketEventQueue": "7A7Nw7VBsYXxMjztCHhhXFaaEfSvFK86N2vaf2ajuaPc"
    }
  ]
}

#### HmSDpiJw7dwymh4UCohZT6PwwXUEZzhzSDouSHKdL94K
{
  "id": "2256fb96-a31e-41b4-8603-16ec29e802c4",
  "success": true,
  "data": [
    null
  ]
}

#### DW9kiyzs78gmVoTMFcW7YH1jBYDYM5ATvpWkDj5CnrU
{
  "id": "9d1f8cb4-2916-4fa7-94fd-ea475a3b9056",
  "success": true,
  "data": [
    {
      "programId": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
      "id": "DW9kiyzs78gmVoTMFcW7YH1jBYDYM5ATvpWkDj5CnrU",
      "mintA": {
        "chainId": 101,
        "address": "EtAduB7TFZ4yEQSubksWz2QMaPsGJuyvH8Tkgox3pump",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/EtAduB7TFZ4yEQSubksWz2QMaPsGJuyvH8Tkgox3pump.png",
        "symbol": "Tapecat",
        "name": "Tapecat",
        "decimals": 6,
        "tags": [],
        "extensions": {}
      },
      "mintB": {
        "chainId": 101,
        "address": "So11111111111111111111111111111111111111112",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/So11111111111111111111111111111111111111112.png",
        "symbol": "WSOL",
        "name": "Wrapped SOL",
        "decimals": 9,
        "tags": [],
        "extensions": {}
      },
      "lookupTableAccount": "3uu9YgLuFzK3oPTQjtQkJ8ffFBExFPAjCGiPghFccxXo",
      "openTime": "1728080790",
      "vault": {
        "A": "BAcSS1i4fEGrqStrrRDHA4uZGXYzrm4KtumeqmFmp4Jw",
        "B": "E7qgibawiEWgkvBeC6EqTMhF2Wvgn8EHnTjg9xzKuG8s"
      },
      "authority": "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
      "openOrders": "FLpPqMW2BVxG4PsZPpWuNirctE5TihxngVpyQ57vqn3P",
      "targetOrders": "2fAgMVmuRWb1X6xQzKnpWUDSsdZKpV2vgqymedsMmg2e",
      "mintLp": {
        "chainId": 101,
        "address": "F8ACLNTsiRGzELjHLrVEMx5MpZFtFjqJ9jpyzNL7Kska",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "",
        "symbol": "",
        "name": "",
        "decimals": 6,
        "tags": [],
        "extensions": {}
      },
      "marketProgramId": "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX",
      "marketId": "JCSbHjdkww4s17iUadDkcrDrjsQZCoJFtmqycBmDMXPG",
      "marketAuthority": "6bXJYxxSdN3Pmeb4mMcvwbvcsyLK711UtJTTW6Z2A9kB",
      "marketBaseVault": "DDJDdcuVarmVZyiU16ruvmrWVVricWbqcXyP15TiSvUL",
      "marketQuoteVault": "H5iwC1sAzd6nCzcBvsL5zhD84s3yTFKuNw79hPtakwfH",
      "marketBids": "ASmBT5NaVEo8NCe8jyVtLifA2jZZiu71R2r9m58ehk2b",
      "marketAsks": "DtkqNSU2kckLreS4tue7iEVXf8vbfbnqM81s9EvaBqWD",
      "marketEventQueue": "GAKpBPd2UNXsPdjtjEJwTqW6Da9qhq8gaNwS2YHxLHwq"
    }
  ]
}
## STABLE_SWAP_AMM : 
#### 7MNfSggpTRM5uLSrKPwgTKLpxwYoqy9piHiuRFrV6Yhi


#### AYf5abBGrwjz2n2gGP4YG91hJer22zakrizrRhddTehS


#### 9DTY3rv8xRa3CnoPoWJCMcQUSY7kUHZAoFKNsBhx8DDz
{
      "programId": "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h",
      "id": "9DTY3rv8xRa3CnoPoWJCMcQUSY7kUHZAoFKNsBhx8DDz",
      "mintA": {
        "chainId": 101,
        "address": "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX.png",
        "symbol": "USDH",
        "name": "USDH Hubble Stablecoin",
        "decimals": 6,
        "tags": [],
        "extensions": {}
      },
      "mintB": {
        "chainId": 101,
        "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "https://img-v1.raydium.io/icon/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png",
        "symbol": "USDC",
        "name": "USD Coin",
        "decimals": 6,
        "tags": [
          "hasFreeze"
        ],
        "extensions": {}
      },
      "openTime": "0",
      "vault": {
        "A": "8WhX9Y6cDkVUhBmm1TT83jX2vT7ZGwXv6zAQiUg84B5U",
        "B": "PH3UpBfXJNazcFtUuxHMFtwtoAYJM9trKMCTqgYX8ZA"
      },
      "authority": "3uaZBfHPfmpAHW7dsimC1SnyR61X4bJqQZKWmRSCXJxv",
      "openOrders": "2a1H2xUFdja6RjPJ6RKWDLraURNCEY85LdP3GXcDeg8y",
      "targetOrders": "7MNfSggpTRM5uLSrKPwgTKLpxwYoqy9piHiuRFrV6Yhi",
      "mintLp": {
        "chainId": 101,
        "address": "7GtZ2MnsH4PLFyvqWmyF3EQXgW78kBXCuAXt41vdKd1y",
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "logoURI": "",
        "symbol": "",
        "name": "",
        "decimals": 6,
        "tags": [],
        "extensions": {}
      },
      "marketProgramId": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
      "marketId": "CaFjigEgJdtGPxQxRjneA1hzNcY5MsHoAAL6Et67QrC5",
      "marketAuthority": "PmGWi4jXyde5y4ed8GdF1Son68LioBRGuazkCoJM8B2",
      "marketBaseVault": "3E3J4Ua9DPM5fdmRxB1AM6S5NqbhBh9exudHcs5jgumz",
      "marketQuoteVault": "D6xgt4XSTRFAqctmY5byT4Ji7mvTihfnuNxjJWPETe7M",
      "marketBids": "AXTKA59Xd53s5a26PNALtnmqfJUWzdyuPN1w5qFMHGio",
      "marketAsks": "HUCmvkqFdwixBBMm2vMgaBfJ5ArY5b7RqfYbACjCPhpp",
      "marketEventQueue": "DMPcCyyqqDhxU852FU6rP6bCy6dfWGWjg2KF21y9DFt4",
      "modelDataAccount": "CDSr3ssLcRB6XYPJwAfFt18MZvEZp4LjHcvzBVZ45duo"
    }