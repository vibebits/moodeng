use crate::errors::InternalError;
use chrono::{DateTime, Utc};
use tracing::debug;
use std::str::FromStr;

use ethers::types::{Address, Signature};
use ethers::utils::keccak256;
use crate::ethereum::types::{Certificate};
use hex;

/// Creates the message that the user signs for the Ethereum certificate.
/// contract_address is parsed from the request ptb/transaction
pub fn message_for_certificate(
    certificate: &Certificate,
    contract_address: &Address,
) -> String {

    // Get the original string representation of the address
    let address_str = format!("0x{}", hex::encode(contract_address));
    let message = format!(
        "Accessing keys of package {} for {} mins from {}, session key {}",
        address_str,
        certificate.ttl_min,
        DateTime::<Utc>::from_timestamp((certificate.creation_time / 1000) as i64, 0)
            .expect("valid timestamp"),
        certificate.session_vk
    );
    
    message
}

/// Verifies an Ethereum signature using EIP-191 personal sign format.
pub async fn verify_signature(
    expected_address: Address, 
    message: &str, 
    signature: &Signature
) -> Result<(), InternalError> {
    // Hash the message (Ethereum personal_sign style - EIP-191)
    let message_bytes = message.as_bytes();
    let prefix = format!("\x19Ethereum Signed Message:\n{}", message_bytes.len());
    let prefixed_message = [prefix.as_bytes(), message_bytes].concat();
    let message_hash = keccak256(prefixed_message);

    // Recover address from signature
    let recovered_address = signature.recover(message_hash)
        .map_err(|e| {
            debug!("Failed to recover address from Ethereum signature: {}", e);
            InternalError::InvalidSignature
        })?;

    // Compare recovered address with the expected address
    if recovered_address == expected_address {
        Ok(())
    } else {
        debug!(
            "Ethereum signature verification failed. Expected: {:?}, Recovered: {:?}",
            expected_address, recovered_address
        );
        Err(InternalError::InvalidSignature)
    }
}

/// Validates an Ethereum certificate by checking its expiration time and signature.
pub async fn check_certificate(
    certificate: &Certificate,
    contract_address: &Address, // this is parsed from the request ptb
) -> Result<(), InternalError> {
    // Check if certificate is expired
    let now = chrono::Utc::now().timestamp_millis() as u64;
    if now > certificate.creation_time + ((certificate.ttl_min as u64) * 60 * 1000) {
        debug!("Ethereum Certificate has expired");
        return Err(InternalError::InvalidCertificate);
    }

    let msg = message_for_certificate(certificate, contract_address);

    debug!("Checking Ethereum certificate signature on message: {:?}", msg);

    verify_signature(certificate.user, &msg, &certificate.signature)
        .await.map_err(|e| {
            debug!("Ethereum certificate signature verification failed: {:?}", e);
            InternalError::InvalidSignature
        })
}