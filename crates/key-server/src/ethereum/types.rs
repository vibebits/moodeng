use serde::{Deserialize, Serialize, Deserializer};
use fastcrypto::ed25519::{Ed25519PublicKey, Ed25519Signature};
use ethers::types::{Address, Signature};
use std::str::FromStr;
use crate::types::{ElGamalPublicKey, ElgamalEncryption, ElgamalVerificationKey};

/// The "session" certificate for Ethereum, signed by the user's Ethereum key.
/// It authorizes a session key to act on the user's behalf.
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Certificate {
    /// User's Ethereum address.
    #[serde(deserialize_with = "deserialize_address")]
    pub user: Address,
    /// The Ed25519 public key of the session.
    pub session_vk: Ed25519PublicKey,
    /// Timestamp of certificate creation (seconds since epoch).
    pub creation_time: u64,
    /// Time-to-live for the certificate in minutes.
    pub ttl_min: u16,
    /// Ethereum signature over (user_eth_address, session_vk, creation_time, ttl_min).
    #[serde(deserialize_with = "deserialize_signature")]
    pub signature: Signature,
}

/// Custom deserializer for Address that accepts hex string
fn deserialize_address<'de, D>(deserializer: D) -> Result<Address, D::Error>
where
    D: Deserializer<'de>,
{
    let s: String = String::deserialize(deserializer)?;
    Address::from_str(&s).map_err(serde::de::Error::custom)
}

/// Custom deserializer for Signature that accepts hex string
fn deserialize_signature<'de, D>(deserializer: D) -> Result<Signature, D::Error>
where
    D: Deserializer<'de>,
{
    let s: String = String::deserialize(deserializer)?;
    Signature::from_str(&s).map_err(serde::de::Error::custom)
}

/// Request structure for fetching a key with Ethereum context.
#[derive(Serialize, Deserialize)]
pub struct FetchKeyRequest {
    /// Ethereum transaction payload
    pub ptb: String,
    /// User's ElGamal public key for encrypting the IBE key.
    pub enc_key: ElGamalPublicKey,
    /// Verification key for the ElGamal public key.
    pub enc_verification_key: ElgamalVerificationKey,
    /// Ed25519 signature by `certificate.session_vk` over (tx, enc_key, enc_verification_key).
    pub request_signature: Ed25519Signature,
    /// The Ethereum certificate authorizing this request.
    pub certificate: Certificate,
}

// Key ID for Ethereum is a vector of bytes
type KeyId = Vec<u8>;

/// Structure for an encrypted decryption key
#[derive(Serialize, Deserialize)]
pub struct DecryptionKey {
    pub id: KeyId,
    pub encrypted_key: ElgamalEncryption,
}

/// Response structure for the fetch_key_eth endpoint.
#[derive(Serialize, Deserialize)]
pub struct FetchKeyResponse {
    pub decryption_keys: Vec<DecryptionKey>,
}

#[derive(Serialize, Deserialize)]
pub struct RequestFormat {
    pub ptb: Vec<u8>,
    pub enc_key: Vec<u8>,
    pub enc_verification_key: Vec<u8>,
}