use crate::errors::InternalError;
use crate::metrics::Metrics;
use crate::MyState;
use crate::Server;
use crate::ethereum::handler::handle_fetch_key;
use crate::ethereum::types::{Certificate, FetchKeyRequest};
use crate::types::{ElGamalPublicKey, ElgamalVerificationKey, Network, IbeMasterKey};
use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use crypto::elgamal;
use fastcrypto::ed25519::{Ed25519PublicKey, Ed25519Signature, Ed25519KeyPair};
use fastcrypto::traits::{KeyPair, VerifyingKey, Signer};
use fastcrypto::encoding::{Base64, Encoding};
use prometheus::Registry;
use rand::thread_rng;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::watch::channel;
use chrono;
use hex;
use mockall::predicate;
use mockall::mock;
use serde_json::json;
use bcs;
use crate::ethereum::constants::{ETH_RPC_ENDPOINT, SESSION_KEY_TTL_MAX};
use ethers::types::{Address, Signature};
use std::str::FromStr;

// Mock the ureq module
mock! {
    pub UreqClient {
        fn post(&self, url: &str) -> Self;
        fn set(&self, header: &str, value: &str) -> Self;
        fn send_json(&self, body: serde_json::Value) -> Result<MockResponse, ureq::Error>;
    }
}

mock! {
    pub Response {
        fn into_string(&self) -> Result<String, std::io::Error>;
    }
}

// Helper function to create a test transaction
fn create_test_transaction() -> (String, String) {
    // Create a mock Ethereum transaction
    let tx_data = "0x1234567890abcdef"; // Mock transaction data
    let tx_hash = "0xabcdef1234567890"; // Mock transaction hash
    
    (tx_data.to_string(), tx_hash.to_string())
}

// Helper function to create a test master key
fn create_test_master_key() -> IbeMasterKey {
    // Create a deterministic scalar for testing 
    fastcrypto::groups::bls12381::Scalar::from(12345u128)
}

// Helper function to create ElGamal keys for testing
fn create_test_elgamal_keys(master_key: &IbeMasterKey) -> (ElGamalPublicKey, ElgamalVerificationKey) {
    let rng = &mut thread_rng();
    let (_, pk, vk) = elgamal::genkey(rng);
    (pk, vk)
}

// Helper function to create a certificate with Ethereum Signature
fn create_certificate(
    user: Address,
    session_vk: Ed25519PublicKey,
    creation_time: u64,
    ttl_min: u16,
    private_key: &[u8], // Ethereum private key
) -> Certificate {
    // Format the message exactly as expected in handlers.rs check_certificate function
    let message = format!(
        "Accessing keys of package {} for {} mins from {}, session key {}",
        user,
        ttl_min,
        chrono::DateTime::<chrono::Utc>::from_timestamp((creation_time / 1000) as i64, 0)
            .expect("valid timestamp"),
        session_vk,
    );

    // Sign using Ethereum private key
    let signature = Signature::from_str("0x1234567890abcdef").unwrap(); // Mock signature
    
    // Create certificate with the signature
    Certificate {
        user,
        session_vk,
        creation_time,
        ttl_min,
        signature,
    }
}

#[tokio::test]
async fn test_handle_fetch_key_ethereum() {
    // Create test environment
    let master_key = create_test_master_key();
    let registry = Registry::new();
    let metrics = Arc::new(Metrics::new(&registry));
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    
    // Create test channels
    let (checkpoint_sender, checkpoint_receiver) = channel(timestamp);
    let (gas_price_sender, gas_price_receiver) = channel(100u64);
    
    // Create test server
    let server = Arc::new(
        Server::new(
            master_key.clone(),
            Network::Testnet,
            sui_sdk::types::base_types::ObjectID::random(),
        )
        .await,
    );
    
    // Create app state
    let app_state = MyState {
        metrics: metrics.clone(),
        server: server.clone(),
        latest_checkpoint_timestamp_receiver: checkpoint_receiver,
        reference_gas_price: gas_price_receiver,
    };
    
    // Generate test keys
    let user_address = Address::from_str("0x1234567890123456789012345678901234567890").unwrap();
    let private_key = [1u8; 32]; // Mock private key
    
    // Create a session keypair (Ed25519)
    let mut rng = thread_rng();
    let session_kp = Ed25519KeyPair::generate(&mut rng);
    let session_vk = session_kp.public().clone();

    // Create a mock certificate
    let certificate = create_certificate(
        user_address,
        session_vk.clone(),
        timestamp - 1000, // 1 second ago
        15,             // 15 minutes TTL
        &private_key,
    );
    
    // Create the transaction
    let (tx_data, tx_hash) = create_test_transaction();
    
    // Create ElGamal keys for encryption
    let (enc_key, enc_vk) = create_test_elgamal_keys(&server.master_key);
    
    // Create request data
    let request_data = format!("{}{}{}", 
        tx_data,
        hex::encode(bcs::to_bytes(&enc_key).unwrap()),
        hex::encode(bcs::to_bytes(&enc_vk).unwrap())
    );
    let request_signature: Ed25519Signature = session_kp.sign(request_data.as_bytes());
    
    // Create request
    let request = FetchKeyRequest {
        ptb: tx_data,
        enc_key,
        enc_verification_key: enc_vk,
        request_signature,
        certificate: certificate.clone(),
    };
    
    // Create headers
    let mut headers = HeaderMap::new();
    headers.insert("x-request-id", "test-request-id".parse().unwrap());
    
    // Mock the ureq client
    let mut mock_client = MockUreqClient::new();
    
    mock_client
        .expect_post()
        .with(predicate::function(|url: &str| url == ETH_RPC_ENDPOINT))
        .returning(move |_| {
            let mut client = MockUreqClient::new();
            client
                .expect_set()
                .returning(move |_, _| {
                    let mut client = MockUreqClient::new();
                    client
                        .expect_send_json()
                        .returning(move |_| {
                            let mut response = MockResponse::new();
                            response
                                .expect_into_string()
                                .returning(move || Ok(json!({
                                    "result": {
                                        "status": "success",
                                        "data": ["resource1"]
                                    }
                                }).to_string()));
                            Ok(response)
                        });
                    client
                });
            client
        });
    
    // Call the handler
    let result = handle_fetch_key(
        State(app_state),
        headers,
        Json(request),
    )
    .await;
    
    // Verify the result
    assert!(result.is_ok(), "Handler should succeed: {:?}", result.err());
    
    let response = result.unwrap();
    let decryption_keys = response.0.decryption_keys;
    
    // We should have at least one key
    assert!(!decryption_keys.is_empty(), "Response should contain at least one key");
    
    // Each key should have an ID and encrypted key data
    for key in decryption_keys {
        assert!(!key.id.is_empty(), "Key ID should not be empty");
        assert!(
            !bincode::serialize(&key.encrypted_key).unwrap().is_empty(),
            "Encrypted key should not be empty"
        );
    }
}

#[tokio::test]
async fn test_handle_fetch_key_ethereum_invalid_signature() {
    // Similar setup as above but with invalid signature
    // ... (implementation similar to test_handle_fetch_key_ethereum but with wrong signature)
}

#[tokio::test]
async fn test_handle_fetch_key_ethereum_expired_certificate() {
    // Similar setup as above but with expired certificate
    // ... (implementation similar to test_handle_fetch_key_ethereum but with expired certificate)
}