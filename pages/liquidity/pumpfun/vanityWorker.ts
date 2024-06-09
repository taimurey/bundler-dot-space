import { Keypair } from '@solana/web3.js';

self.onmessage = (event) => {
    let vanityAddress = Keypair.generate();
    while (!vanityAddress.publicKey.toBase58().endsWith(event.data)) {
        vanityAddress = Keypair.generate();
    }
    self.postMessage({
        secretKey: vanityAddress.secretKey,
        publicKey: vanityAddress.publicKey.toBase58(),
    });
}