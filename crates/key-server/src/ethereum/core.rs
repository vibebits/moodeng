use crate::errors::InternalError;
use crate::ethereum::ptb::{parse_ptb, simulate_transaction_bundle};
use ethers::types::{Address};
use hex;
use crypto::create_full_id;
use tracing::{debug};

/// Checks if a user has permission to access resources based on the seal contract.
pub async fn check_seal_approve(
    contract_address: &Address,
    ptb: &str,
    cert_user: &Address,
    metrics: Option<&crate::metrics::Metrics>,
    req_id: Option<&str>,
) -> Result<Vec<Vec<u8>>, InternalError> {
    debug!(
        "Attempting to check seal approval for contract: {}, user: {}, eq_id: {:?}",
        contract_address, cert_user, req_id
    );

    // Parse PTB to get transactions
    let transactions = parse_ptb(ptb)?;

    // Simulate the transaction bundle
    let response = simulate_transaction_bundle(
        &transactions,
        &cert_user,
        "84532", // Base Sepolia testnet
        None,
    )
    .await?;

    let mut valid_key_ids: Vec<Vec<u8>> = vec![];

    // Parse simulation results
    for i in 0..response["simulation_results"].as_array().unwrap().len() {
        if (response["simulation_results"][i]["simulation"]["status"] == false) {
            return Err(InternalError::InvalidPTB(
                "Transaction simulation failed".to_string(),
            ));
        }

        println!(
            "### Simulation index: {:?} is {:?}",
            i, response["simulation_results"][i]["simulation"]["status"]
        );
        println!(
            "### Transaction logs: {:?}",
            response["simulation_results"][i]["transaction"]["transaction_info"]["logs"][0]["raw"]
        );
        println!(
            "### Transaction call_trace I/O: {:?} - {:?}",
            response["simulation_results"][i]["transaction"]["call_trace"][0]["input"],
            response["simulation_results"][i]["transaction"]["call_trace"][0]["output"]
        );

        // output is successful
        if response["simulation_results"][i]["transaction"]["call_trace"][0]["output"]
            == "0x0000000000000000000000000000000000000000000000000000000000000001"
        {
            let input: &str = response["simulation_results"][i]["transaction"]["call_trace"][0]
                ["input"]
                .as_str()
                .unwrap();
            let key_id_hex = input.strip_prefix("0x").unwrap()[8..72].to_string(); // Skip 4 bytes (8 hex chars) of function hash
            let key_id_bytes32 = hex::decode(&key_id_hex).unwrap();

            let mut padded_contract = [0u8; 32];
            padded_contract[12..].copy_from_slice(&contract_address.as_bytes());
            let full_id = create_full_id(&padded_contract, &key_id_bytes32);

            valid_key_ids.push(full_id);
        }

        println!("########################################################");
    }

    println!("### valid_key_ids: {:?}", valid_key_ids.len());
    Ok(valid_key_ids)
}
