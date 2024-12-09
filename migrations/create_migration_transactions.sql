CREATE TABLE IF NOT EXISTS migration_transactions (
    id SERIAL PRIMARY KEY,
    mint_address TEXT NOT NULL,
    signature TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('withdraw', 'add')),
    timestamp TIMESTAMP NOT NULL,
    pool_id TEXT,
    is_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_migration_transactions_mint ON migration_transactions(mint_address);
CREATE INDEX idx_migration_transactions_signature ON migration_transactions(signature); 