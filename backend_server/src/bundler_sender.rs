use std::sync::Arc;

use actix_web::web;
use jito_protos::searcher::SubscribeBundleResultsRequest;
use jito_searcher_client::{get_searcher_client, send_bundle_with_confirmation};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    signature::Keypair,
    transaction::{Transaction, VersionedTransaction},
};

#[derive(serde::Deserialize, serde::Serialize, Debug)]
pub struct BundleData {
    pub txns: Vec<String>,
    pub blockengine: String,
}

#[derive(Debug)]
enum SolanaTransaction {
    Legacy(Transaction),
    Versioned(VersionedTransaction),
}

pub async fn bundler_sender(
    bundle: web::Json<BundleData>,
) -> Result<String, Box<dyn std::error::Error>> {
    let connection = RpcClient::new("".to_string());
    let transactions: Vec<_> = bundle
        .txns
        .iter()
        .map(|txn| {
            let txn_bytes = bs58::decode(txn).into_vec().unwrap();
            // Try to deserialize as VersionedTransaction first
            match bincode::deserialize::<VersionedTransaction>(&txn_bytes) {
                Ok(versioned) => SolanaTransaction::Versioned(versioned),
                Err(_) => {
                    // If that fails, try to deserialize as a legacy Transaction
                    let legacy = bincode::deserialize::<Transaction>(&txn_bytes).expect(
                        "Failed to deserialize as either VersionedTransaction or Transaction",
                    );
                    SolanaTransaction::Legacy(legacy)
                }
            }
        })
        .collect();

    transactions.iter().for_each(|txn| match txn {
        SolanaTransaction::Legacy(t) => println!("{:?}", t.signatures),
        SolanaTransaction::Versioned(vt) => println!("{:?}", vt.signatures),
    });

    let mut client = get_searcher_client(&bundle.blockengine, &Arc::new(auth_keypair())).await?;

    let mut bundle_results_subscription = client
        .subscribe_bundle_results(SubscribeBundleResultsRequest {})
        .await?
        .into_inner();

    // Convert SolanaTransaction enum back to VersionedTransaction for sending
    let versioned_txns: Vec<VersionedTransaction> = transactions
        .into_iter()
        .map(|txn| match txn {
            SolanaTransaction::Versioned(vt) => vt,
            SolanaTransaction::Legacy(t) => VersionedTransaction::from(t),
        })
        .collect();

    let bundle = send_bundle_with_confirmation(
        &versioned_txns,
        &Arc::new(connection),
        &mut client,
        &mut bundle_results_subscription,
    )
    .await?;

    Ok(bundle)
}

pub fn auth_keypair() -> Keypair {
    let bytes_auth_vec = vec![
        198, 214, 173, 4, 113, 67, 147, 103, 75, 216, 80, 150, 174, 158, 63, 61, 10, 228, 165, 151,
        189, 0, 34, 29, 24, 166, 40, 136, 166, 58, 116, 242, 35, 218, 175, 128, 50, 244, 240, 13,
        176, 112, 152, 243, 132, 142, 93, 20, 112, 225, 9, 103, 175, 8, 161, 234, 247, 176, 242,
        78, 131, 96, 57, 100,
    ];
    let bytes_auth = bytes_auth_vec.as_slice();
    let auth_keypair = Keypair::from_bytes(bytes_auth).unwrap();
    auth_keypair
}
