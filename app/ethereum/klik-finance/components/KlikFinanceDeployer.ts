import KlikABI from './klik.json';

// Klik Finance contract addresses for different networks
const KLIK_CONTRACTS = {
    ethereum: '0xd6DD539E54b12D79f5D88399e211478Acd3C87cB', // Klik Finance contract address on mainnet
    sepolia: '0xd6DD539E54b12D79f5D88399e211478Acd3C87cB',  // Klik Finance contract address on Sepolia (update if different)
};

// Network RPC URLs
const RPC_URLS = {
    ethereum: 'https://eth.llamarpc.com',
    sepolia: 'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
};

// Network configurations
const NETWORK_CONFIG = {
    ethereum: {
        chainId: '0x1',
        name: 'Ethereum Mainnet',
        explorer: 'https://etherscan.io',
        currency: 'ETH'
    },
    sepolia: {
        chainId: '0xaa36a7',
        name: 'Sepolia Testnet',
        explorer: 'https://sepolia.etherscan.io',
        currency: 'ETH'
    }
};

export interface CoinDeploymentParams {
    name: string;
    symbol: string;
    metadata: string;
    network: 'ethereum' | 'sepolia';
    privateKey: string;
    deploymentFee?: string;
    imageUrl?: string;
    cdnUrl?: string;
    tokenName?: string;
    tokenSymbol?: string;
}

export interface DeploymentResult {
    transactionHash: string;
    contractAddress?: string;
    tokenAddress?: string;
    gasUsed?: string;
    gasPrice?: string;
    totalCost?: string;
    success: boolean;
    message: string;
    explorerUrl?: string;
}

export class KlikFinanceDeployer {
    private ethers: any;
    private provider: any;
    private wallet: any;
    private contract: any;
    private network: string;

    constructor(network: string, privateKey: string) {
        this.network = network;
        this.initializeAsync(network, privateKey);
    }

    private async initializeAsync(network: string, privateKey: string) {
        try {
            // Dynamic import ethers to avoid SSR issues
            this.ethers = await import('ethers');

            // Validate network
            if (!RPC_URLS[network as keyof typeof RPC_URLS]) {
                throw new Error(`Unsupported network: ${network}`);
            }

            // Initialize provider
            const rpcUrl = RPC_URLS[network as keyof typeof RPC_URLS];
            this.provider = new this.ethers.JsonRpcProvider(rpcUrl);

            // Initialize wallet
            this.wallet = new this.ethers.Wallet(privateKey, this.provider);

            // Initialize contract
            const contractAddress = KLIK_CONTRACTS[network as keyof typeof KLIK_CONTRACTS];
            this.contract = new this.ethers.Contract(contractAddress, KlikABI, this.wallet);

            console.log(`Initialized KlikFinanceDeployer for ${network}`);
            console.log(`Contract Address: ${contractAddress}`);
            console.log(`Wallet Address: ${this.wallet.address}`);

            // Verify contract exists
            const code = await this.provider.getCode(contractAddress);
            if (code === '0x') {
                throw new Error(`No contract found at address ${contractAddress} on ${network}`);
            }

            // Verify contract has the expected functions
            try {
                // Test if we can call a view function
                await this.contract.tokenCount();
                console.log('✅ Contract verification successful - Klik Finance functions available');
            } catch (error) {
                console.warn('⚠️ Contract verification failed - may not be a valid Klik Finance contract');
            }

        } catch (error) {
            console.error('Failed to initialize KlikFinanceDeployer:', error);
            throw error;
        }
    }

    /**
     * Deploy a new coin using Klik Finance
     */
    async deployCoin(params: CoinDeploymentParams): Promise<DeploymentResult> {
        try {
            // Ensure initialization is complete
            await this.initializeAsync(params.network, params.privateKey);

            console.log('🚀 Starting Klik Finance deployment with params:', {
                name: params.name,
                symbol: params.symbol,
                network: params.network,
                imageUrl: params.imageUrl,
                deploymentFee: params.deploymentFee
            });

            // Validate parameters
            if (!params.name || !params.symbol) {
                throw new Error('Token name and symbol are required');
            }

            if (params.name.length > 50) {
                throw new Error('Token name must be 50 characters or less');
            }

            if (params.symbol.length > 10) {
                throw new Error('Token symbol must be 10 characters or less');
            }

            // Check wallet balance
            const balance = await this.getBalance();
            const minBalance = parseFloat(params.deploymentFee || '0') + 0.01; // Add buffer for gas

            if (parseFloat(balance) < minBalance) {
                throw new Error(`Insufficient balance. Required: ${minBalance} ${NETWORK_CONFIG[params.network as keyof typeof NETWORK_CONFIG].currency}, Available: ${balance}`);
            }

            // Estimate gas
            const deploymentFeeWei = this.ethers.parseEther(params.deploymentFee || '0');

            console.log('⛽ Estimating gas for deployment...');
            const gasEstimate = await this.contract.deployCoin.estimateGas(
                params.name,
                params.symbol,
                params.metadata,
                { value: deploymentFeeWei }
            );

            // Get current gas price
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice;

            // Add 20% buffer to gas estimate
            const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

            const estimatedCost = gasPrice * gasLimit;
            const totalCost = estimatedCost + deploymentFeeWei;

            console.log('💰 Gas estimation:', {
                gasEstimate: gasEstimate.toString(),
                gasPrice: this.ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
                estimatedCost: this.ethers.formatEther(estimatedCost) + ' ETH',
                deploymentFee: this.ethers.formatEther(deploymentFeeWei) + ' ETH',
                totalCost: this.ethers.formatEther(totalCost) + ' ETH'
            });

            // Execute deployment transaction
            console.log('📝 Sending deployment transaction...');
            const tx = await this.contract.deployCoin(
                params.name,
                params.symbol,
                params.metadata,
                {
                    value: deploymentFeeWei,
                    gasLimit,
                    gasPrice
                }
            );

            console.log('⏳ Transaction sent:', tx.hash);
            console.log('Waiting for confirmation...');

            // Wait for transaction to be mined
            const receipt = await tx.wait();

            console.log('✅ Transaction confirmed!');
            console.log('Receipt:', receipt);

            // Extract token address from events
            let tokenAddress: string | undefined;

            // Look for ERC20TokenCreated event
            if (receipt.logs && receipt.logs.length > 0) {
                for (const log of receipt.logs) {
                    try {
                        const parsed = this.contract.interface.parseLog(log);
                        if (parsed && parsed.name === 'ERC20TokenCreated') {
                            tokenAddress = parsed.args.tokenAddress;
                            console.log('🎉 Token created at address:', tokenAddress);
                            break;
                        }
                    } catch (e) {
                        // Skip unparseable logs
                    }
                }
            }

            const networkConfig = NETWORK_CONFIG[params.network as keyof typeof NETWORK_CONFIG];
            const explorerUrl = tokenAddress
                ? `${networkConfig.explorer}/token/${tokenAddress}`
                : `${networkConfig.explorer}/tx/${receipt.hash}`;

            const result: DeploymentResult = {
                transactionHash: receipt.hash,
                contractAddress: await this.contract.getAddress(),
                tokenAddress,
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: gasPrice.toString(),
                totalCost: this.ethers.formatEther(receipt.gasUsed * gasPrice),
                success: true,
                message: `Token deployed successfully! ${params.name} (${params.symbol}) on ${networkConfig.name}`,
                explorerUrl
            };

            console.log('🎊 Deployment successful:', result);
            return result;

        } catch (error: any) {
            console.error('❌ Deployment failed:', error);

            let errorMessage = 'Deployment failed';

            if (error.code === 'INSUFFICIENT_FUNDS') {
                errorMessage = 'Insufficient funds for deployment. Please add more ETH to your wallet.';
            } else if (error.code === 'REPLACEMENT_UNDERPRICED') {
                errorMessage = 'Transaction underpriced. Please try again with higher gas.';
            } else if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.reason) {
                errorMessage = `Contract error: ${error.reason}`;
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                transactionHash: '',
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Get wallet balance in ETH
     */
    async getBalance(): Promise<string> {
        try {
            if (!this.provider || !this.wallet) {
                throw new Error('Wallet not initialized');
            }
            const balance = await this.provider.getBalance(this.wallet.address);
            return this.ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting balance:', error);
            return '0';
        }
    }

    /**
     * Get wallet address
     */
    getWalletAddress(): string {
        return this.wallet?.address || '';
    }

    /**
     * Get deployed tokens count
     */
    async getTokenCount(): Promise<number> {
        try {
            const count = await this.contract.tokenCount();
            return Number(count);
        } catch (error) {
            console.error('Error getting token count:', error);
            return 0;
        }
    }

    /**
     * Get deployed token info by index
     */
    async getDeployedToken(index: number) {
        try {
            const tokenInfo = await this.contract.deployedTokens(index);
            return {
                tokenAddress: tokenInfo.tokenAddress,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                deployer: tokenInfo.deployer,
                timestamp: new Date(Number(tokenInfo.time) * 1000),
                metadata: tokenInfo.metadata,
                marketCapInETH: this.ethers.formatEther(tokenInfo.marketCapInETH)
            };
        } catch (error) {
            console.error('Error getting deployed token:', error);
            return null;
        }
    }

    /**
     * Estimate deployment cost
     */
    async estimateDeploymentCost(
        name: string,
        symbol: string,
        metadata: string = '',
        deploymentFee: string = '0'
    ): Promise<{
        gasEstimate: string;
        gasPrice: string;
        estimatedCost: string;
        deploymentFee: string;
        totalCost: string;
    }> {
        try {
            const deploymentFeeWei = this.ethers.parseEther(deploymentFee);

            const gasEstimate = await this.contract.deployCoin.estimateGas(
                name,
                symbol,
                metadata || '{}',
                { value: deploymentFeeWei }
            );

            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice;
            const estimatedCost = gasPrice * (gasEstimate * BigInt(120) / BigInt(100)); // Add 20% buffer
            const totalCost = estimatedCost + deploymentFeeWei;

            return {
                gasEstimate: gasEstimate.toString(),
                gasPrice: this.ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
                estimatedCost: this.ethers.formatEther(estimatedCost),
                deploymentFee,
                totalCost: this.ethers.formatEther(totalCost)
            };
        } catch (error) {
            console.error('Error estimating cost:', error);
            throw error;
        }
    }
}

/**
 * Helper function to deploy a coin with simplified parameters
 */
export async function deployKlikCoin(params: CoinDeploymentParams): Promise<DeploymentResult> {
    const deployer = new KlikFinanceDeployer(params.network, params.privateKey);
    return await deployer.deployCoin(params);
}

/**
 * Helper function to validate Ethereum private key
 */
export function validatePrivateKey(privateKey: string): boolean {
    try {
        if (typeof window === 'undefined') {
            return false; // Can't validate on server side
        }
        // Validate private key format
        return /^0x[a-fA-F0-9]{64}$/.test(privateKey);
    } catch {
        return false;
    }
}

/**
 * Helper function to validate Ethereum address
 */
export function validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get network configuration
 */
export function getNetworkConfig(network: keyof typeof NETWORK_CONFIG) {
    return NETWORK_CONFIG[network];
}

/**
 * Check if MetaMask is available
 */
export function isWalletAvailable(): boolean {
    return typeof window !== 'undefined' &&
        typeof (window as any).ethereum !== 'undefined';
}

/**
 * Connect to MetaMask wallet
 */
export async function connectWallet(): Promise<string | null> {
    if (!isWalletAvailable()) {
        throw new Error('MetaMask not found. Please install MetaMask.');
    }

    try {
        const ethereum = (window as any).ethereum;
        const accounts = await ethereum.request({
            method: 'eth_requestAccounts'
        });
        return accounts[0] || null;
    } catch (error: any) {
        throw new Error(`Failed to connect wallet: ${error.message}`);
    }
}

/**
 * Get wallet balance using MetaMask
 */
export async function getWalletBalance(address: string): Promise<string> {
    if (!isWalletAvailable()) {
        throw new Error('MetaMask not found');
    }

    try {
        const ethereum = (window as any).ethereum;
        const balance = await ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest'],
        });

        // Convert from wei to ether
        const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
        return balanceInEth.toFixed(4);
    } catch (error: any) {
        throw new Error(`Failed to get balance: ${error.message}`);
    }
} 