"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMemoTransaction = exports.onBundleResult = exports.build_bundle = void 0;
var web3_js_1 = require("@solana/web3.js");
var types_1 = require("jito-ts/dist/sdk/block-engine/types");
var utils_1 = require("jito-ts/dist/sdk/block-engine/utils");
var raydium_sdk_1 = require("@raydium-io/raydium-sdk");
var config_1 = require("../removeLiquidity/config");
// import { BundleResult } from "jito-ts/dist/gen/block-engine/bundle";
var MEMO_PROGRAM_ID = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";
function build_bundle(search, 
// accounts: PublicKey[],
// regions: string[],
bundleTransactionLimit, lp_ix, swap_ix, conn, buyerkeypair, deployerkeypair) {
    return __awaiter(this, void 0, void 0, function () {
        var _tipAccount, tipAccount, bund, resp, willSendTx1, willSendTx2, maybeBundle, response_bund, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, search.getTipAccounts()];
                case 1:
                    _tipAccount = (_a.sent())[0];
                    console.log("tip account:", _tipAccount);
                    tipAccount = new web3_js_1.PublicKey(_tipAccount);
                    bund = new types_1.Bundle([], bundleTransactionLimit);
                    return [4 /*yield*/, config_1.connection.getLatestBlockhash("processed")];
                case 2:
                    resp = _a.sent();
                    return [4 /*yield*/, (0, raydium_sdk_1.buildSimpleTransaction)({
                            connection: config_1.connection,
                            makeTxVersion: config_1.makeTxVersion,
                            payer: deployerkeypair.publicKey,
                            innerTransactions: lp_ix,
                            addLookupTableInfo: config_1.addLookupTableInfo,
                        })];
                case 3:
                    willSendTx1 = _a.sent();
                    return [4 /*yield*/, (0, raydium_sdk_1.buildSimpleTransaction)({
                            connection: config_1.connection,
                            makeTxVersion: config_1.makeTxVersion,
                            payer: buyerkeypair.publicKey,
                            innerTransactions: swap_ix,
                            addLookupTableInfo: config_1.addLookupTableInfo,
                        })];
                case 4:
                    willSendTx2 = _a.sent();
                    if (willSendTx1[0] instanceof web3_js_1.VersionedTransaction) {
                        willSendTx1[0].sign([deployerkeypair]);
                        // txids.push(await connection.sendTransaction(iTx, options));
                        bund.addTransactions(willSendTx1[0]);
                    }
                    if (willSendTx2[0] instanceof web3_js_1.VersionedTransaction) {
                        willSendTx2[0].sign([buyerkeypair]);
                        // txids.push(await connection.sendTransaction(iTx, options));
                        bund.addTransactions(willSendTx2[0]);
                    }
                    maybeBundle = bund.addTipTx(buyerkeypair, 1000, tipAccount, resp.blockhash);
                    if ((0, utils_1.isError)(maybeBundle)) {
                        throw maybeBundle;
                    }
                    console.log();
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, search.sendBundle(maybeBundle)];
                case 6:
                    response_bund = _a.sent();
                    console.log("response_bund:", response_bund);
                    return [3 /*break*/, 8];
                case 7:
                    e_1 = _a.sent();
                    console.error("error sending bundle:", e_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/, maybeBundle];
            }
        });
    });
}
exports.build_bundle = build_bundle;
var onBundleResult = function (c) {
    var first = 0;
    var isResolved = false;
    return new Promise(function (resolve) {
        // Set a timeout to reject the promise if no bundle is accepted within 5 seconds
        setTimeout(function () {
            resolve(first);
            isResolved = true;
        }, 30000);
        c.onBundleResult(function (result) {
            var _a, _b;
            if (isResolved)
                return first;
            // clearTimeout(timeout); // Clear the timeout if a bundle is accepted
            // const bundleId = result.bundleId;
            var isAccepted = result.accepted;
            var isRejected = result.rejected;
            if (isResolved == false) {
                if (isAccepted) {
                    console.log("bundle accepted, ID:", result.bundleId, " Slot: ", (_b = (_a = result.accepted) === null || _a === void 0 ? void 0 : _a.slot) !== null && _b !== void 0 ? _b : 0);
                    first += 1;
                    isResolved = true;
                    resolve(first); // Resolve with 'first' when a bundle is accepted
                }
                if (isRejected) {
                    console.log("bundle is Rejected:", result);
                    // Do not resolve or reject the promise here
                }
            }
        }, function (e) {
            console.error(e);
            // Do not reject the promise here
        });
    });
};
exports.onBundleResult = onBundleResult;
var buildMemoTransaction = function (keypair, recentBlockhash, message) {
    var ix = new web3_js_1.TransactionInstruction({
        keys: [
            {
                pubkey: keypair.publicKey,
                isSigner: true,
                isWritable: true,
            },
        ],
        programId: new web3_js_1.PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(message),
    });
    var instructions = [ix];
    var messageV0 = new web3_js_1.TransactionMessage({
        payerKey: keypair.publicKey,
        recentBlockhash: recentBlockhash,
        instructions: instructions,
    }).compileToV0Message();
    var tx = new web3_js_1.VersionedTransaction(messageV0);
    tx.sign([keypair]);
    return tx;
};
exports.buildMemoTransaction = buildMemoTransaction;
