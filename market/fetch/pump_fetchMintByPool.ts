import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import Logger from '../utils/logger';

// Interface for token account information
export interface market_TokenAccountInfo {
    accountAddress: string;
    mint: string;
    owner: string;
    amount: string;
    delegateOption: number;
    delegate: string | null;
    state: number;
    isNative: string;
    delegatedAmount: string;
    closeAuthorityOption: number;
    closeAuthority: string | null;
}

// Interface for the function response
export interface FetchPoolDataResponse {
    success: boolean;
    tokenAccounts: market_TokenAccountInfo[];
    error?: string;
}

/**
 * Fetches and parses token account information for a given bonding curve pool
 * @param connection - Solana RPC connection
 * @param bc_pubkey - Public key of the bonding curve pool
 * @returns Promise<FetchPoolDataResponse>
 */
export async function fetchMintByPool(
    connection: Connection,
    bc_pubkey: string
): Promise<FetchPoolDataResponse> {
    const logger = new Logger('pump_fetchPoolData');

    try {
        // // logger.info(`Attempting to fetch token accounts for: ${bc_pubkey}`);
        
        // Validate public key format
        try {
            new PublicKey(bc_pubkey);
        } catch (e) {
            logger.error(`Invalid public key format: ${bc_pubkey}`);
            return {
                success: false,
                tokenAccounts: [],
                error: 'Invalid public key format'
            };
        }

        // Fetch token accounts owned by the pool
        // // logger.info('Fetching token accounts from connection...');
        const tokenAccounts = await connection.getTokenAccountsByOwner(
            new PublicKey(bc_pubkey),
            {
                programId: TOKEN_PROGRAM_ID,
            }
        );

        // logger.info(`Found ${tokenAccounts.value.length} token accounts`);

        // Process and parse token accounts
        const parsedTokenAccounts: market_TokenAccountInfo[] = tokenAccounts.value.map(tokenAccount => {
            try {
                const accountInfo = AccountLayout.decode(tokenAccount.account.data);
                
                return {
                    accountAddress: tokenAccount.pubkey.toString(),
                    mint: new PublicKey(accountInfo.mint).toString(),
                    owner: new PublicKey(accountInfo.owner).toString(),
                    amount: accountInfo.amount.toString(),
                    delegateOption: accountInfo.delegateOption,
                    delegate: accountInfo.delegate ? new PublicKey(accountInfo.delegate).toString() : null,
                    state: accountInfo.state,
                    isNative: accountInfo.isNative.toString(),
                    delegatedAmount: accountInfo.delegatedAmount.toString(),
                    closeAuthorityOption: accountInfo.closeAuthorityOption,
                    closeAuthority: accountInfo.closeAuthority ? new PublicKey(accountInfo.closeAuthority).toString() : null,
                };
            } catch (e) {
                logger.error(`Error parsing token account ${tokenAccount.pubkey.toString()}:`, e);
                throw e;
            }
        });

        // logger.info(`Successfully parsed ${parsedTokenAccounts.length} token accounts`);

        return {
            success: true,
            tokenAccounts: parsedTokenAccounts
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? 
            `${error.message}\n${error.stack}` : 
            'Unknown error occurred';
        
        logger.error('Error in fetchPoolData:', errorMessage);
        
        return {
            success: false,
            tokenAccounts: [],
            error: errorMessage
        };
    }
} 