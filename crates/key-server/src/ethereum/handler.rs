use axum::{
    extract::State,
    Json,
    http::HeaderMap,
};
use tracing::{debug, info, warn};
use crate::errors::InternalError; 
use crate::{MyState, KeyId};
use crypto::elgamal::encrypt;
use crypto::ibe::extract;
use rand::thread_rng;

use crate::ethereum::types::{Certificate, FetchKeyRequest, FetchKeyResponse, DecryptionKey};
use crate::ethereum::certificate::check_certificate;
use crate::ethereum::request::verify_request_signature;
use crate::ethereum::core::check_seal_approve;
use crate::ethereum::ptb::{parse_ptb, get_first_contract_address_from_ptb};
use crate::metrics::Metrics;
use crate::ALLOWED_STALENESS;
use crate::types::{ElGamalPublicKey, ElgamalVerificationKey};
use fastcrypto::ed25519::Ed25519Signature;
use std::time::Instant;

/// Create response with encrypted keys
fn create_response(
    server: &crate::Server,
    key_ids: &[Vec<u8>],
    enc_key: &ElGamalPublicKey,
) -> FetchKeyResponse {
    let mut decryption_keys = Vec::new();
    let mut rng = thread_rng();

    for id in key_ids {
        // Extract a key based on the ID
        let derived_key = extract(&server.master_key, id);

        // Encrypt the derived key with user's key
        let encrypted_key = encrypt(&mut rng, &derived_key, enc_key);

        println!("extract key for id: {:?}", id);
        // Add to response
        decryption_keys.push(DecryptionKey {
            id: id.clone(),
            encrypted_key,
        });
    }

    FetchKeyResponse { decryption_keys }
}

/// Main handler for the `/v1/fetch_key_ethereum` endpoint.
pub async fn handle_fetch_key(
    State(app_state): State<MyState>,
    headers: HeaderMap,
    Json(payload): Json<FetchKeyRequest>,
) -> Result<Json<FetchKeyResponse>, InternalError> {
    let metrics = &app_state.metrics;

    // Extract request ID for logging
    let req_id = headers
        .get("x-request-id")
        .map(|v| v.to_str().unwrap_or_default());

    println!("handle_fetch_key req_id: {:?}", req_id);

    // Increment request counter
    metrics.requests.inc();

    // Check if the full node is fresh
    app_state.check_full_node_is_fresh(ALLOWED_STALENESS)?;

    // Check SDK version if provided in headers
    if let Some(sdk_version) = headers.get("Client-Sdk-Version") {
        if let Ok(version_str) = sdk_version.to_str() {
            // Using the appropriate method to validate SDK version
            if let Err(e) = app_state.validate_sdk_version(version_str) {
                metrics.observe_error(e.as_str());
                return Err(e);
            }
        }
    }

    debug!("Received /v1/fetch_key_ethereum request (req_id: {:?})", req_id);

    // Parse ethereum transactions from ptb bytes
    let parsed_ptb = parse_ptb(&payload.ptb).map_err(|e| {
        warn!(
            "Failed to parse ptb: {:?} (req_id: {:?})",
            e, req_id
        );
        metrics.observe_error(e.as_str());
        e
    })?;

    println!("PTB (array of transactions) parsed successfully (req_id: {:?})", req_id);

    // check request for its signature (also get contract address (to field))
    // then checkcertificate for its validity and signature (with contract address from request)
    // then check policy (seal_approve)
    // then extract key ids
    let key_ids = check_request(
        &payload.ptb,
        &payload.enc_key,
        &payload.enc_verification_key,
        &payload.request_signature,
        &payload.certificate,
        Some(metrics),
        req_id,
        &app_state.server,
    )
    .await
    .map_err(|e| {
        warn!("check_request failed: {:?} (req_id: {:?})", e, req_id);
        metrics.observe_error(e.as_str());
        e
    })?;

    println!("Key IDs extracted count: {:?}", key_ids.len());

    // Create response with keys
    let response = create_response(&app_state.server, &key_ids, &payload.enc_key);

    println!(
        "Response created with {} keys",
        response.decryption_keys.len()
    );
    info!("Fetch key request successful (req_id: {:?})", req_id);

    Ok(Json(response))
}

/// This is the overall main function
/// It checks the request, certificate, and policy
/// It returns the key ids
async fn check_request(
    ptb: &str,
    enc_key: &ElGamalPublicKey,
    enc_verification_key: &ElgamalVerificationKey,
    request_signature: &Ed25519Signature,
    certificate: &Certificate,
    metrics: Option<&Metrics>,
    req_id: Option<&str>,
    _server: &crate::Server,
) -> Result<Vec<Vec<u8>>, InternalError> {
    let _start = Instant::now();

    // Verify request signature (signs over transaction + encryption keys)
    verify_request_signature(
        ptb,
        enc_key,
        enc_verification_key,
        request_signature,
        &certificate.session_vk,
        req_id,
    ).await?;

    debug!(
        "Request signature verified successfully (req_id: {:?})",
        req_id
    );

    // Get first contract address from ptb
    let contract_address = get_first_contract_address_from_ptb(&ptb).map_err(|e| {
        warn!("Failed to get contract address from ptb: {:?} (req_id: {:?})", e, req_id);
        if let Some(m) = metrics {
            m.observe_error(e.as_str());
        }
        e
    })?;

    println!("first contract_address: {:?}", contract_address);

    // Check certificate validity
    check_certificate(certificate, &contract_address).await?;

    debug!("Certificate validity checked successfully (req_id: {:?})", req_id);

    // Check policy by simulating the transaction
    let valid_key_ids: Vec<Vec<u8>> = check_seal_approve(
        &contract_address,
        ptb,
        &certificate.user,
        metrics,
        req_id,
    ).await?;

    debug!("Policy checked successfully (req_id: {:?})", req_id);
    debug!("Key IDs count: {:?}", valid_key_ids.len());

    // Report metrics if available
    if let Some(m) = metrics {
        m.requests_per_number_of_ids.observe(valid_key_ids.len() as f64);
    }

    Ok(valid_key_ids)
}