"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupTableCache = exports.LP_wallet_keypair = exports.jito_auth_keypair = exports.sell_remove_fees = exports.sell_swap_take_profit_ratio = exports.sell_swap_tokens_percentage = exports.swap_sol_amount = exports.LP_remove_tokens_take_profit_at_sol = exports.LP_remove_tokens_percentage = exports.quote_Mint_amount = exports.delay_pool_open_time = exports.input_baseMint_tokens_percentage = exports.blockEngineUrl = exports.DEFAULT_TOKEN = exports.addLookupTableInfo = exports.makeTxVersion = exports.RAYDIUM_MAINNET_API = exports.ENDPOINT = exports.PROGRAMIDS = exports.connection = void 0;
var raydium_sdk_1 = require("@raydium-io/raydium-sdk");
var web3_js_1 = require("@solana/web3.js");
var bs58_1 = __importDefault(require("bs58"));
exports.connection = new web3_js_1.Connection(process.env.NEXT_PUBLIC_MAINNET_URL ? process.env.NEXT_PUBLIC_MAINNET_URL : (function () { throw new Error("NEXT_PUBLIC_MAINNET_URL is not set"); })());
exports.PROGRAMIDS = raydium_sdk_1.MAINNET_PROGRAM_ID;
exports.ENDPOINT = raydium_sdk_1.ENDPOINT;
exports.RAYDIUM_MAINNET_API = raydium_sdk_1.RAYDIUM_MAINNET;
exports.makeTxVersion = raydium_sdk_1.TxVersion.V0; // LEGACY
exports.addLookupTableInfo = raydium_sdk_1.LOOKUP_TABLE_CACHE;
exports.DEFAULT_TOKEN = {
    'SOL': new raydium_sdk_1.Currency(9, 'USDC', 'USDC'),
    'WSOL': new raydium_sdk_1.Token(raydium_sdk_1.TOKEN_PROGRAM_ID, new web3_js_1.PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'WSOL'),
    'USDC': new raydium_sdk_1.Token(raydium_sdk_1.TOKEN_PROGRAM_ID, new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 6, 'USDC', 'USDC'),
    'RAY': new raydium_sdk_1.Token(raydium_sdk_1.TOKEN_PROGRAM_ID, new web3_js_1.PublicKey('8WsJDk89JMYEGoJCaU7zGfj3Cupq2pR2oKHZW3rUf6Qk'), 6, 'RAY', 'RAY'),
    'RAY_USDC-LP': new raydium_sdk_1.Token(raydium_sdk_1.TOKEN_PROGRAM_ID, new web3_js_1.PublicKey('FGYXP4vBkMEtKhxrmEBcWN8VNmXX8qNgEJpENKDETZ4Y'), 6, 'RAY-USDC', 'RAY-USDC'),
};
// define these
exports.blockEngineUrl = 'tokyo.mainnet.block-engine.jito.wtf';
// const jito_auth_private_key = "aaaaaaaaaaaaaaaa";
// const wallet_2_pay_jito_fees = "aaaaaaaaaaaaaaaa";
var LP_wallet_private_key = "aaaaaaaaaaaaaaaa";
// const swap_wallet_private_key = "aaaaaaaaaaaaaaaa";
// export const market_id = new PublicKey("aaaaaaaaaaaaaaaaaaag6snCe2iUR3A");
exports.input_baseMint_tokens_percentage = 1; //ABC-Mint amount of tokens you want to add in Lp e.g. 1% = 100%. 0.9= 90%
exports.delay_pool_open_time = Number(0); //dont change it because then you wont be able to perform swap in bundle.
exports.quote_Mint_amount = 0.5; //COIN-SOL, amount of SOL u want to add to Pool amount
// remove lp:
exports.LP_remove_tokens_percentage = 1; //ABC-Mint amount of tokens in Lp that you want to remove e.g. 1% = 100%. 0.9= 90%
exports.LP_remove_tokens_take_profit_at_sol = 2; //I want to remove all lp when sol reached 2 SOL
// swap info:
exports.swap_sol_amount = 0.5; //Amount of SOl u want to invest
exports.sell_swap_tokens_percentage = 0.5; // % of tokens u want to sell=> 1 means 100%
exports.sell_swap_take_profit_ratio = 2; // take profit e.g. 2x 3x
// swap sell and remove lp fees in lamports.
exports.sell_remove_fees = 5000000;
// ignore these
exports.jito_auth_keypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array([198, 214, 173, 4, 113, 67, 147, 103, 75, 216, 80, 150, 174, 158, 63, 61, 10, 228, 165, 151, 189, 0, 34, 29, 24, 166, 40, 136, 166, 58, 116, 242, 35, 218, 175, 128, 50, 244, 240, 13, 176, 112, 152, 243, 132, 142, 93, 20, 112, 225, 9, 103, 175, 8, 161, 234, 247, 176, 242, 78, 131, 96, 57, 100]));
// export const wallet_2_pay_jito_fees_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(wallet_2_pay_jito_fees)));
// export const LP_wallet_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(LP_wallet_private_key)));
// export const swap_wallet_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(swap_wallet_private_key)));
function LP_wallet_keypair() {
    return web3_js_1.Keypair.fromSecretKey(new Uint8Array(bs58_1.default.decode(LP_wallet_private_key)));
}
exports.LP_wallet_keypair = LP_wallet_keypair;
exports.lookupTableCache = {};
