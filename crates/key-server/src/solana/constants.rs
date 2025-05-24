/// Expected discriminator for `seal_approve` instruction
pub const SEAL_APPROVE_DISCRIMINATOR: &[u8; 8] = &[114, 84, 92, 48, 48, 9, 84, 182];

/// Solana RPC endpoint
pub const SOLANA_RPC_ENDPOINT: &str = "https://devnet.helius-rpc.com/?api-key=89cd3a03-a3f3-4a14-be3f-3c8fac89ec49"; // "http://localhost:8899";

/// Maximum TTL for session keys in minutes
pub const SESSION_KEY_TTL_MAX: u16 = 30; 