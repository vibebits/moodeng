/// Ethereum RPC endpoint
pub const ETH_RPC_ENDPOINT: &str = "http://localhost:8545";

/// Maximum TTL for session keys in minutes
pub const SESSION_KEY_TTL_MAX: u16 = 30; 

/// Expected function selector for seal_approve
pub const SEAL_APPROVE_SELECTOR: &[u8; 4] = &[0x12, 0x34, 0x56, 0x78]; // Replace with actual selector

/// Tenderly API endpoint
pub const TENDERLY_API_ENDPOINT: &str = "https://api.tenderly.co/api/v1/account/may19/project/project/simulate-bundle";

use std::env;
use dotenv::dotenv;

pub fn get_tenderly_access_key() -> Result<String, String> {
    dotenv().ok();
    env::var("TENDERLY_ACCESS_KEY")
        .map_err(|_| "TENDERLY_ACCESS_KEY must be set".to_string())
}
