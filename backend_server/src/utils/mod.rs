use solana_sdk::{instruction::Instruction, pubkey::Pubkey, system_instruction};

pub mod rand;

pub fn tip_txn(source: Pubkey, destination: Pubkey, priority: u64) -> Instruction {
    let ix = system_instruction::transfer(&source, &destination, priority);
    ix
}
