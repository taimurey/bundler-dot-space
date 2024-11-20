use std::sync::Arc;

use actix_web::web;
use bincode::serialize;
use bundlerbackend::{
    env::{rpc_client, tip_account},
    utils::tip_txn,
};
use jito_protos::searcher::SubscribeBundleResultsRequest;
use jito_searcher_client::{get_searcher_client, send_bundle_with_confirmation};
use log::info;
use serde::Serialize;
use solana_sdk::{
    message::VersionedMessage, native_token::sol_to_lamports, signature::Keypair, signer::Signer,
    system_instruction, transaction::VersionedTransaction,
};

use crate::{bundler_sender::auth_keypair, utils::rand::randomizer};

#[derive(Debug, Clone, serde::Deserialize, Serialize)]
pub struct DistributorForm {
    pub payer: String,
    pub recievers: Vec<String>,
    pub total_amount: String,
    pub min_amount: String,
    pub max_amount: String,
    pub block_engine_url: String,
}

pub async fn sol_distribution(
    payer_key: Arc<Keypair>,
    wallets: &&[Keypair],
    total_amount: u64,
    min_amount: u64,
    max_amount: u64,
) -> eyre::Result<(Vec<u64>, Vec<VersionedTransaction>)> {
    let connection = rpc_client();

    let buyer_wallet = Arc::new(payer_key);

    let rand_amount = randomizer(total_amount, wallets.len(), min_amount, max_amount);

    let wallet_chunks: Vec<_> = wallets.chunks(21).collect();
    let mut bundle_txns = vec![];

    let recent_blockhash = connection.get_latest_blockhash().await?;

    for (index, wallet_chunk) in wallet_chunks.iter().enumerate() {
        let mut current_instructions = Vec::new();

        for (i, wallet) in wallet_chunk.iter().enumerate() {
            let transfer_instruction = system_instruction::transfer(
                &buyer_wallet.pubkey(),
                &wallet.pubkey(),
                rand_amount[index],
            );

            current_instructions.push(transfer_instruction);

            if index == wallet_chunks.len() - 1 && i == wallet_chunk.len() - 1 {
                info!("Adding tip to last transaction");
                let tip = tip_txn(buyer_wallet.pubkey(), tip_account(), sol_to_lamports(0.01));
                current_instructions.push(tip);
            }
        }

        let versioned_msg = VersionedMessage::V0(
            match solana_sdk::message::v0::Message::try_compile(
                &buyer_wallet.pubkey(),
                &current_instructions,
                &[],
                recent_blockhash,
            ) {
                Ok(message) => message,
                Err(e) => {
                    eprintln!("Error: {}", e);
                    panic!("Error: {}", e);
                }
            },
        );

        let transaction = VersionedTransaction::try_new(versioned_msg, &[&buyer_wallet])?;

        bundle_txns.push(transaction);
    }

    let mut sum = 0;
    let txn_size: Vec<_> = bundle_txns
        .iter()
        .map(|x| {
            let serialized_x = serialize(x).unwrap();
            //sum all of them
            sum += serialized_x.len();
            serialized_x.len()
        })
        .collect();

    println!("Sum: {:?}", sum);
    println!("txn_size: {:?}", txn_size);

    println!("Generated transactions: {}", bundle_txns.len());

    Ok((rand_amount, bundle_txns))
}

pub async fn distributor(
    wallets: Vec<Keypair>,
    payer: Arc<Keypair>,
    total_amount: u64,
    min_amount: u64,
    max_amount: u64,
    block_engine_url: String,
) -> eyre::Result<()> {
    let connection = Arc::new(rpc_client());

    let mut client = get_searcher_client(&block_engine_url, &Arc::new(auth_keypair())).await?;

    let mut bundle_results_subscription = client
        .subscribe_bundle_results(SubscribeBundleResultsRequest {})
        .await
        .expect("subscribe to bundle results")
        .into_inner();

    // let wallets: Vec<Keypair> = match load_wallets().await {
    //     Ok(wallets) => wallets,
    //     Err(e) => {
    //         eprintln!("Error: {}", e);
    //         panic!("Error: {}", e);
    //     }
    // };
    // let total_amount = sol_amount("Total Amount:").await;
    // let max_amount = sol_amount("Max Distribution Amount:").await;

    // let min_amount = sol_amount("Min Distribution Amount:").await;
    // let bundle_tip = bundle_priority_tip().await;

    let wallet_chunks = wallets.chunks(104).collect::<Vec<_>>();

    for (index, wallet_chunk) in wallet_chunks.iter().enumerate() {
        let (amounts, transactions_1) = match sol_distribution(
            payer.clone(),
            wallet_chunk,
            total_amount,
            min_amount,
            max_amount,
        )
        .await
        {
            Ok((amounts, transactions_1)) => (amounts, transactions_1),
            Err(e) => {
                eprintln!("Error: {}", e);
                panic!("Error: {}", e);
            }
        };

        info!("Sending Bundle");

        let bundle = match send_bundle_with_confirmation(
            &transactions_1,
            &connection,
            &mut client,
            &mut bundle_results_subscription,
        )
        .await
        {
            Ok(_) => {}
            Err(e) => {
                eprintln!("Distribution Error: {}", e);
                return Ok(());
            }
        };
    }

    Ok(())
}

pub async fn distributor_router(data: web::Data<DistributorForm>) {
    let wallets: Vec<_> = data
        .recievers
        .iter()
        .map(|x| Keypair::from_base58_string(x))
        .collect();

    let payer = Keypair::from_base58_string(&data.payer);

    let total_amount = data.total_amount.parse::<u64>().unwrap();
    let min_amount = data.min_amount.parse::<u64>().unwrap();
    let max_amount = data.max_amount.parse::<u64>().unwrap();

    match distributor(
        wallets,
        Arc::new(payer),
        total_amount,
        min_amount,
        max_amount,
        data.block_engine_url.clone(),
    )
    .await
    {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Error: {}", e);
            panic!("Error: {}", e);
        }
    }
}
