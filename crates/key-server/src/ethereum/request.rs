use fastcrypto::ed25519::{Ed25519PublicKey, Ed25519Signature};
use fastcrypto::traits::VerifyingKey;
use tracing::debug;
use crate::errors::InternalError;
use crate::types::{ElGamalPublicKey, ElgamalVerificationKey};
use crate::ethereum::types::RequestFormat;
use bcs;
use fastcrypto::encoding::{Base64, Encoding};
use hex;

/// Creates the message that the user signs for the Ethereum request.
/// The message is a concatenation of "ETH_REQUEST_MSG:", eth_tx_payload,
/// enc_key bytes, and enc_verification_key bytes.
pub fn message_for_request(
    ptb_bytes: &Vec<u8>,
    enc_key: &ElGamalPublicKey,
    enc_verification_key: &ElgamalVerificationKey,
) -> Vec<u8> {
    // For Ethereum, we don't need to slice like in Sui
    let req = RequestFormat {
        ptb: ptb_bytes.clone(),
        enc_key: bcs::to_bytes(enc_key).expect("should serialize"),
        enc_verification_key: bcs::to_bytes(enc_verification_key).expect("should serialize"),
    };

    println!(
        "Request bytes length: {}",
        bcs::to_bytes(&req).expect("should serialize").len()
    );

    // Use BCS serialization to match the frontend
    bcs::to_bytes(&req).expect("should serialize")
}

/// Verifies the Ed25519 signature of the request
pub async fn verify_request_signature(
    ptb: &str,
    enc_key: &ElGamalPublicKey,
    enc_verification_key: &ElgamalVerificationKey,
    request_signature: &Ed25519Signature,
    session_vk: &Ed25519PublicKey,
    req_id: Option<&str>,
) -> Result<(), InternalError> {    
    // Decode base64 PTB to get the raw bytes
    let ptb_bytes = Base64::decode(ptb)
        .map_err(|e| InternalError::InvalidPTB(format!("Failed to decode ptb: {}", e)))?;
    println!("ptb_bytes (hex): {}", hex::encode(&ptb_bytes));

    // Create the signed request data - same format as in Sui version
    let request_bytes = message_for_request(&ptb_bytes, enc_key, enc_verification_key);
    println!("Request bytes (hex): {}", hex::encode(&request_bytes));

    // Log the signature and verification key
    println!("Signature (hex): {}", hex::encode(request_signature.as_ref()));
    println!("Verification key (hex): {}", hex::encode(session_vk.as_ref()));

    // Verify the Ed25519 signature using session verification key
    if session_vk
        .verify(&request_bytes, request_signature)
        .is_err()
    {
        debug!(
            "Request signature verification failed (req_id: {:?})",
            req_id
        );
        return Err(InternalError::InvalidSignature);
    }

    println!(
        "Request signature verification passed (req_id: {:?})",
        req_id
    );

    Ok(())
} 