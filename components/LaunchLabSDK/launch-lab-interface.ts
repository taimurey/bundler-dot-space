import {
    Raydium,
    TxVersion,
    DEV_LAUNCHPAD_PROGRAM,
    LAUNCHPAD_PROGRAM,
    getPdaLaunchpadConfigId,
    LaunchpadConfig,
    getPdaLaunchpadPoolId,
    Curve,
    PlatformConfig
} from '@raydium-io/raydium-sdk-v2'
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import BN from 'bn.js'
import Decimal from 'decimal.js'
import bs58 from 'bs58'

// Interfaces for function parameters
interface CreateMintParams {
    privateKey: string;
    connection: Connection;
    name: string;
    symbol: string;
    decimals?: number;
    uri: string;
    buyAmount: string | number;
    slippage?: BN;
    platform?: string;
    createOnly?: boolean;
    txVersion?: TxVersion;
}

interface BuyTokenParams {
    privateKey: string;
    connection: Connection;
    mintAddress: string;
    buyAmount: string | number;
    slippage?: BN;
    platform?: string;
    txVersion?: TxVersion;
}

interface SellTokenParams {
    privateKey: string;
    connection: Connection;
    mintAddress: string;
    sellAmount: string | number;
    slippage?: BN;
    txVersion?: TxVersion;
}

interface GetPoolInfoParams {
    connection: Connection;
    mintAddress: string;
}

class LaunchLabSDK {
    // Initialize SDK with connection and wallet
    static async initSdk(privateKey: string, connection: Connection, cluster: 'mainnet' | 'devnet' = 'mainnet') {
        const owner = Keypair.fromSecretKey(bs58.decode(privateKey))

        const raydium = await Raydium.load({
            owner,
            connection,
            cluster,
            disableFeatureCheck: true,
            blockhashCommitment: 'finalized',
        })

        return raydium
    }

    // Create a new mint and launchpad
    static async createMint({
        privateKey,
        connection,
        name,
        symbol,
        decimals = 6,
        uri,
        buyAmount,
        slippage = new BN(100), // 1%
        platform,
        createOnly = true,
        txVersion = TxVersion.V0,
    }: CreateMintParams) {
        const raydium = await this.initSdk(privateKey, connection)
        const programId = connection.rpcEndpoint.includes('devnet') ? DEV_LAUNCHPAD_PROGRAM : LAUNCHPAD_PROGRAM

        const pair = Keypair.generate()
        const mintA = pair.publicKey

        const configId = getPdaLaunchpadConfigId(programId, NATIVE_MINT, 0, 0).publicKey

        const configData = await connection.getAccountInfo(configId)
        if (!configData) throw new Error('Config not found')

        const configInfo = LaunchpadConfig.decode(configData.data)
        const mintBInfo = await raydium.token.getTokenInfo(configInfo.mintB)

        console.log(buyAmount);
        const inAmount = new BN(buyAmount.toString())

        const platformId = platform ? new PublicKey(platform) : undefined

        try {
            const { execute, transactions, extInfo } = await raydium.launchpad.createLaunchpad({
                programId,
                mintA,
                decimals,
                name,
                symbol,
                migrateType: 'amm',
                uri,
                configId,
                configInfo,
                mintBDecimals: mintBInfo.decimals,
                platformId,
                txVersion,
                slippage,
                buyAmount: inAmount,
                createOnly,
                extraSigners: [pair],
            })

            // const result = await execute({ sequentially: true })
            return {
                // result,
                mintAddress: mintA.toString(),
                poolId: extInfo.address.poolId.toString(),
                transactions
            }
        } catch (error) {
            console.error('Error creating mint:', error)
            throw error
        }
    }

    // Buy tokens from a launchpad
    static async buyToken({
        privateKey,
        connection,
        mintAddress,
        buyAmount,
        slippage = new BN(100), // 1%
        platform,
        txVersion = TxVersion.V0,
    }: BuyTokenParams) {
        const raydium = await this.initSdk(privateKey, connection)
        const programId = connection.rpcEndpoint.includes('devnet') ? DEV_LAUNCHPAD_PROGRAM : LAUNCHPAD_PROGRAM

        const mintA = new PublicKey(mintAddress)
        const mintB = NATIVE_MINT
        const inAmount = new BN(buyAmount.toString())

        const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey
        const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId })
        const data = await connection.getAccountInfo(poolInfo.platformId)
        const platformInfo = PlatformConfig.decode(data!.data)

        try {
            // Calculate expected output amount
            const res = Curve.buyExactIn({
                poolInfo,
                amountB: inAmount,
                protocolFeeRate: poolInfo.configInfo.tradeFeeRate,
                platformFeeRate: platformInfo.feeRate,
                curveType: poolInfo.configInfo.curveType,
                shareFeeRate: new BN(0),
            })

            const minOutAmount = new Decimal(res.amountA.toString())
                .mul((10000 - slippage.toNumber()) / 10000)
                .toFixed(0)

            const { transaction, extInfo, execute } = await raydium.launchpad.buyToken({
                programId,
                mintA,
                slippage,
                configInfo: poolInfo.configInfo,
                platformFeeRate: platformInfo.feeRate,
                txVersion,
                buyAmount: inAmount,
            })


            return {
                expectedAmount: extInfo.outAmount.toString(),
                transaction
            }
        } catch (error) {
            console.error('Error buying token:', error)
            throw error
        }
    }

    // Sell tokens from a launchpad
    static async sellToken({
        privateKey,
        connection,
        mintAddress,
        sellAmount,
        slippage = new BN(100), // 1%
        txVersion = TxVersion.V0,
    }: SellTokenParams) {
        const raydium = await this.initSdk(privateKey, connection)
        const programId = connection.rpcEndpoint.includes('devnet') ? DEV_LAUNCHPAD_PROGRAM : LAUNCHPAD_PROGRAM

        const mintA = new PublicKey(mintAddress)
        const mintB = NATIVE_MINT
        const inAmount = new BN(sellAmount.toString())

        const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey
        const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId })
        const data = await connection.getAccountInfo(poolInfo.platformId)
        const platformInfo = PlatformConfig.decode(data!.data)

        try {
            // Calculate expected output amount
            const res = Curve.sellExactIn({
                poolInfo,
                amountA: inAmount,
                protocolFeeRate: poolInfo.configInfo.tradeFeeRate,
                platformFeeRate: platformInfo.feeRate,
                curveType: poolInfo.configInfo.curveType,
                shareFeeRate: new BN(0),
            })

            const minOutAmount = new Decimal(res.amountB.toString())
                .mul((10000 - slippage.toNumber()) / 10000)
                .toFixed(0)

            const { execute, transaction } = await raydium.launchpad.sellToken({
                programId,
                mintA,
                configInfo: poolInfo.configInfo,
                platformFeeRate: platformInfo.feeRate,
                txVersion,
                sellAmount: inAmount,
            })

            const result = await execute({ sendAndConfirm: true })

            return {
                result,
                expectedAmount: res.amountB.toString(),
                transaction
            }
        } catch (error) {
            console.error('Error selling token:', error)
            throw error
        }
    }

    // Get pool information
    static async getPoolInfo({
        connection,
        mintAddress,
    }: GetPoolInfoParams) {
        const programId = connection.rpcEndpoint.includes('devnet') ? DEV_LAUNCHPAD_PROGRAM : LAUNCHPAD_PROGRAM
        const mintA = new PublicKey(mintAddress)
        const mintB = NATIVE_MINT

        const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey

        try {
            // We need to initialize raydium with a temporary keypair just to access SDK methods
            const tempKeypair = Keypair.generate()
            const raydium = await Raydium.load({
                owner: tempKeypair,
                connection,
                cluster: connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet',
                disableFeatureCheck: true,
            })

            const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId })
            return poolInfo
        } catch (error) {
            console.error('Error getting pool info:', error)
            throw error
        }
    }
}

export default LaunchLabSDK 