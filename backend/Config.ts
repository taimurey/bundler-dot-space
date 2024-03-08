import {
    ENDPOINT as _ENDPOINT,
    Currency,
    LOOKUP_TABLE_CACHE,
    MAINNET_PROGRAM_ID,
    RAYDIUM_MAINNET,
    Token,
    TOKEN_PROGRAM_ID,
    TxVersion,
} from '@raydium-io/raydium-sdk';
import {
    Connection,
    Keypair,
    PublicKey,
} from '@solana/web3.js';

export const rpcUrl: string = 'https://xxx.xxx.xxx/'
export const rpcToken: string | undefined = undefined

export const wallet = Keypair.fromSecretKey(Buffer.from('<YOUR_WALLET_SECRET_KEY>'))

export const http_connection = new Connection('<YOUR_RPC_URL>');

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

export const ENDPOINT = _ENDPOINT;

export const RAYDIUM_MAINNET_API = RAYDIUM_MAINNET;

export const makeTxVersion = TxVersion.V0; // LEGACY

export const addLookupTableInfo = LOOKUP_TABLE_CACHE // only mainnet. other = undefined

export const DEFAULT_TOKEN = {
    'SOL': new Currency(9, 'USDC', 'USDC'),
    'WSOL': new Token(TOKEN_PROGRAM_ID, new PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'WSOL'),
    'USDC': new Token(TOKEN_PROGRAM_ID, new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 6, 'USDC', 'USDC'),
    'RAY': new Token(TOKEN_PROGRAM_ID, new PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'), 6, 'RAY', 'RAY'),
    'RAY_USDC-LP': new Token(TOKEN_PROGRAM_ID, new PublicKey('FGYXP4vBkMEtKhxrmEBcWN8VNmXX8qNgEJpENKDETZ4Y'), 6, 'RAY-USDC', 'RAY-USDC'),
}


import { Agent } from 'https'; // change to http if using http connection..
import convict from 'convict';
import { JitoRpcConnection } from 'jito-ts';
import * as dotenv from 'dotenv';

const agent = new Agent({
    keepAlive: true,
    timeout: 4000,
    maxSockets: 2048
});


export const connection = new JitoRpcConnection('', {
    //  wsEndpoint: '',
    // commitment: 'confirmed',
    httpAgent: agent
});

export const RayLiqPoolv4 = {
    string: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    pubKey: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
};

export const rayFee = new PublicKey('7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5');

export const LAMPORTS_IN = 100000000; // 0.1 SOL. This needs to be adjusted dynamically based on target TX amount + slippage and pool conditions, ideally on-chain.

dotenv.config();

const config = convict({
    bot_name: {
        format: String,
        default: 'didnotexpectthis',
        env: 'BOT_NAME'
    },
    num_worker_threads: {
        format: Number,
        default: 12,
        env: 'NUM_WORKER_THREADS'
    },
    block_engine_urls: {
        format: Array,
        default: ['frankfurt.mainnet.block-engine.jito.wtf', 'amsterdam.mainnet.block-engine.jito.wtf'],
        doc: 'block engine urls. bot will mempool subscribe to all and send bundles to first one',
        env: 'BLOCK_ENGINE_URLS'
    },
    auth_keypair_path: {
        format: String,
        default: './auth.json',
        env: 'AUTH_KEYPAIR_PATH'
    },
    rpc_url: {
        format: String,
        default: '',
        env: 'RPC_URL'
    },
    rpc_requests_per_second: {
        format: Number,
        default: 0,
        env: 'RPC_REQUESTS_PER_SECOND'
    },
    rpc_max_batch_size: {
        format: Number,
        default: 20,
        env: 'RPC_MAX_BATCH_SIZE'
    },
    geyser_url: {
        format: String,
        default: 'amsterdam.mainnet.rpc.jito.wtf',
        env: 'GEYSER_URL'
    },
    geyser_access_token: {
        format: String,
        default: '00000000-0000-0000-0000-000000000000',
        env: 'GEYSER_ACCESS_TOKEN'
    },
    arb_calculation_num_steps: {
        format: Number,
        default: 3,
        env: 'ARB_CALCULATION_NUM_STEPS'
    },
    max_arb_calculation_time_ms: {
        format: Number,
        default: 15,
        env: 'MAX_ARB_CALCULATION_TIME_MS'
    },
    payer_keypair_path: {
        format: String,
        default: './auth.json',
        env: 'PAYER_KEYPAIR_PATH'
    },
    min_tip_lamports: {
        format: Number,
        default: 10000,
        env: 'MIN_TIP_LAMPORTS'
    },
    tip_percent: {
        format: Number,
        default: 50,
        env: 'TIP_PERCENT'
    }
});

config.validate({ allowed: 'strict' });

export { config };
