use crate::errors::InternalError;
use crate::ethereum::constants::get_tenderly_access_key;
use ethers::types::{Address, Transaction};
use ethers::utils::{rlp, keccak256};
use serde_json::json;
use reqwest;
use hex;
use fastcrypto::encoding::{Base64, Encoding};
use std::str::FromStr;

/// Parse transaction input data into selector and parameters
pub fn parse_transaction_input(input: &[u8]) -> Result<([u8; 4], &[u8]), InternalError> {
    if input.len() < 4 {
        return Err(InternalError::InvalidPTB("Transaction input too short".to_string()));
    }
    
    let selector = [input[0], input[1], input[2], input[3]];
    let policy_id = &input[4..36]; // 1st param

    Ok((selector, policy_id))
}

/// Get the 4-byte selector for seal_approve(bytes32) function
pub fn get_seal_approve_selector() -> [u8; 4] {
    let function_signature = "seal_approve(bytes32)";
    let hash = keccak256(function_signature.as_bytes());
    [hash[0], hash[1], hash[2], hash[3]]
}

/// Parse a transaction from a hex string
pub fn parse_transaction(transaction_str: &str) -> Result<Transaction, InternalError> {
    // Remove "0x" prefix if present
    let tx_hex = transaction_str.strip_prefix("0x").unwrap_or(transaction_str);
    
    // Decode hex string to bytes
    let tx_bytes = hex::decode(tx_hex)
        .map_err(|e| InternalError::InvalidPTB(format!("Invalid hex string: {}", e)))?;
    
    // Parse transaction using RLP
    let tx = rlp::decode::<Transaction>(&tx_bytes)
        .map_err(|e| InternalError::InvalidPTB(format!("Failed to parse transaction: {}", e)))?;
    
    Ok(tx)
}

/// Parse a transaction bundle which is a list of transactions
pub fn parse_ptb(ptb: &str) -> Result<Vec<Transaction>, InternalError> {
    println!("ptb: {:?}", ptb);
    
    // Decode base64 to get the JSON string
    let json_str = Base64::decode(ptb)
        .map_err(|e| InternalError::InvalidPTB(format!("Invalid base64 encoding: {}", e)))?;
    
    println!("json_str: {:?}", json_str);
    
    // Parse JSON array of transaction objects
    #[derive(serde::Deserialize)]
    struct TxObject {
        to: String,
        data: String,
    }
    
    let tx_objects: Vec<TxObject> = serde_json::from_slice(&json_str)
        .map_err(|e| InternalError::InvalidPTB(format!("Invalid JSON format: {}", e)))?;
    

    
    // Parse each transaction
    let mut transactions = Vec::new();
    for tx_obj in tx_objects {
        // Create a transaction from the object
        let tx = Transaction {
            to: Some(Address::from_str(&tx_obj.to)
                .map_err(|e| InternalError::InvalidPTB(format!("Invalid address: {}", e)))?),
            input: ethers::types::Bytes::from_str(&tx_obj.data)
                .map_err(|e| InternalError::InvalidPTB(format!("Invalid data: {}", e)))?,
            ..Default::default()
        };
        transactions.push(tx);
    }
    
    Ok(transactions)
}

// Get the first contract address from the ptb/transaction
pub fn get_first_contract_address_from_ptb(ptb: &str) -> Result<Address, InternalError> {
    let transactions = parse_ptb(ptb)?;
    transactions[0].to
        .ok_or_else(|| InternalError::InvalidPTB("Transaction has no recipient".to_string()))
}

/// Simulates a bundle of transactions using Tenderly's API endpoint
pub async fn simulate_transaction_bundle(
    transactions: &[Transaction],
    cert_user: &Address,
    network_id: &str,
    state_overrides: Option<serde_json::Value>,
) -> Result<serde_json::Value, InternalError> {
    // Convert transactions to the format expected by Tenderly API
    let simulations: Vec<serde_json::Value> = transactions
        .iter()
        .map(|tx| {
            json!({
                "network_id": network_id,
                "save": true,
                "save_if_fails": true,
                "simulation_type": "quick",
                "from": format!("0x{}", hex::encode(cert_user.as_bytes())),
                "to": tx.to.map(|addr| format!("0x{}", hex::encode(addr.as_bytes()))),
                "input": format!("0x{}", hex::encode(&tx.input)),
                // "value": 0,
                // "gas": 100000,
                // "gas_price": 1000000000,
            })
        })
        .collect();


    // Create HTTP client
    let client = reqwest::Client::new();
    
    let request_body = json!({
        "simulations": simulations
    });
    
    // Debug print the exact JSON being sent
    println!("### Request JSON: {}", serde_json::to_string_pretty(&request_body).unwrap());
    
    // Make the API call
    let response = client
        .post("https://api.tenderly.co/api/v1/account/may19/project/project/simulate-bundle")
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .header("X-Access-Key", get_tenderly_access_key().map_err(|e| InternalError::InvalidPTB(e))?)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| InternalError::InvalidPTB(format!("Failed to send request: {}", e)))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| InternalError::InvalidPTB(format!("Failed to parse response: {}", e)))?;

    // log each of simulation_result
    // for i in 0..response["simulation_results"].as_array().unwrap().len() {
    //     println!("### Simulation index: {:?} is {:?}", i, response["simulation_results"][i]["simulation"]["status"]);
    //     println!("### Transaction logs: {:?}", response["simulation_results"][i]["transaction"]["transaction_info"]["logs"][0]["raw"]);
    //     println!("Transaction call_trace input: {:?}", response["simulation_results"][i]["transaction"]["call_trace"][0]["input"]);
    //     println!("Transaction call_trace output: {:?}", response["simulation_results"][i]["transaction"]["call_trace"][0]["output"]);

    //     println!("########################################################");
    // }

    Ok(response)

}

#[cfg(test)]
mod tests {
    use super::*;
    use ethers::types::{Address, U256};
    use std::str::FromStr;

    fn bytes32_to_id_string(bytes32: &[u8; 32]) -> String {
        // Remove trailing zeros and convert to string
        let mut result = Vec::new();
        for &byte in bytes32.iter() {
            if byte != 0 {
                result.push(byte);
            }
        }
        String::from_utf8_lossy(&result).to_string()
    }

    fn id_string_to_bytes32(id_string: &str) -> [u8; 32] {
        let mut bytes32 = [0u8; 32];
        let hex_bytes = hex::encode(id_string);
        println!("### hex_bytes: {:?}", hex_bytes);
        let start_idx = 32 - hex_bytes.len() / 2;
        for (i, byte) in hex_bytes.as_bytes().chunks(2).enumerate() {
            let byte_str = std::str::from_utf8(byte).unwrap();
            bytes32[start_idx + i] = u8::from_str_radix(byte_str, 16).unwrap();
        }
        bytes32
    }
    
    #[tokio::test]
    async fn test_simulate_transaction_bundle() {
        let from_address_str = "0xa5f66cC6959c1Eb84827887b31dA55e250647992";
        let from_address = Address::from_str(from_address_str).unwrap();

        let contract_address_str = "0xb492bb3849046633a5a0656cbeedb3a8b4f8fceb";
        let contract_address = Address::from_str(contract_address_str).unwrap();

        let chain_id = "84532"; // Base Sepolia

        // Create 3 test transactions calling seal_approve with different bytes32 values
        let tx1 = Transaction {
            from: from_address,
            to: Some(contract_address),
            value: U256::from(0),
            gas: U256::from(100000),
            gas_price: Some(U256::from(1000000000)),
            input: {
                let mut input = get_seal_approve_selector().to_vec();
                input.extend_from_slice(&id_string_to_bytes32("12345"));
                ethers::types::Bytes::from(input)
            },
            nonce: U256::from(0),
            ..Default::default()
        };

        let tx2 = Transaction {
            from: from_address,
            to: Some(contract_address),
            value: U256::from(0),
            gas: U256::from(100000),
            gas_price: Some(U256::from(1000000000)),
            input: {
                let mut input = get_seal_approve_selector().to_vec();
                input.extend_from_slice(&id_string_to_bytes32("54321"));
                ethers::types::Bytes::from(input)
            },
            nonce: U256::from(0),
            ..Default::default()
        };

        let tx3 = Transaction {
            from: from_address,
            to: Some(contract_address),
            value: U256::from(0),
            gas: U256::from(100000),
            gas_price: Some(U256::from(1000000000)),
            input: {
                let mut input = get_seal_approve_selector().to_vec();
                input.extend_from_slice(&id_string_to_bytes32("12300AA"));
                ethers::types::Bytes::from(input)
            },
            nonce: U256::from(1),
            ..Default::default()
        };

        let transactions = vec![tx1, tx2, tx3];

        // Simulate the bundle on Optimism (chain ID 10)
        let result = simulate_transaction_bundle(
            &transactions,
            &from_address,
            chain_id,
            None
        ).await;

        // println!("result: {:?}", result);

        match result {
            Ok(response) => {
                assert!(response.is_object(), "Response should be a JSON object");
                // println!("Simulation response: {:?}", response);
            }
            Err(e) => {
                panic!("Simulation failed: {:?}", e);
            }
        }
    }

    #[test]
    fn test_bytes32_conversion() {
        let bytes32 = hex::decode("cf4c279a9d1eb6abf27b1d8ae5d923419b5f728c8704449bbc8f721fbfe0b19e").unwrap();
        let mut bytes32_array = [0u8; 32];
        bytes32_array.copy_from_slice(&bytes32);
        let original = bytes32_to_id_string(&bytes32_array);
        println!("Original value: {}", original);
    }
}
