'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaBook, FaDiscord, FaXTwitter } from 'react-icons/fa6';
import { IoDocumentText } from 'react-icons/io5';
import SolanaIcon from './icons/SolanaIcon';
import { FaBitcoin } from 'react-icons/fa';
import { SiEthereum } from 'react-icons/si';
import { CLUSTERS, CUSTOM_RPC_CLUSTER, SolanaCluster, useSolana } from './SolanaWallet/SolanaContext';
import { Check, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

// TypeScript interfaces
interface CryptoPrice {
    price: string;
    connected: boolean;
}

interface CryptoPrices {
    sol: CryptoPrice;
    btc: CryptoPrice;
    eth: CryptoPrice;
}

interface BinanceTickerData {
    c: string; // Current price
    P: string; // Price change percentage
    [key: string]: any; // Allow other properties
}

// Helper function to format price with K suffix
const formatPrice = (price: string | number, crypto: 'sol' | 'btc' | 'eth'): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (crypto === 'sol' || crypto === 'eth') {
        return numPrice.toFixed(2);
    }

    if (numPrice >= 1000) {
        return `${(numPrice / 1000).toFixed(1)}K`;
    }

    return numPrice.toFixed(0);
};

const BottomBar: React.FC = () => {
    const { cluster, setCluster, customEndpoint, setCustomEndpoint } = useSolana();
    const [customRpcValue, setCustomRpcValue] = useState(customEndpoint);

    // State for cryptocurrency prices
    const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
        sol: { price: '--', connected: false },
        btc: { price: '--', connected: false },
        eth: { price: '--', connected: false }
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [serverStatus, setServerStatus] = useState<'loading' | 'operational' | 'error'>('loading');
    const [isCustomRpcOpen, setIsCustomRpcOpen] = useState(false);

    // Function to check server health
    const checkServerHealth = async () => {
        try {
            const response = await fetch('https://api.bundler.space/health');
            if (response.ok && (await response.text()) === 'OK') {
                setServerStatus('operational');
            } else {
                setServerStatus('error');
            }
        } catch (error) {
            console.error('Error checking server health:', error);
            setServerStatus('error');
        }
    };

    useEffect(() => {
        // Check server health initially
        checkServerHealth();

        // Set up interval to check server health every 30 seconds
        const healthInterval = setInterval(checkServerHealth, 30000);

        // Clean up interval on component unmount
        return () => clearInterval(healthInterval);
    }, []);

    useEffect(() => {
        // Set the custom RPC value if cluster is custom
        if (cluster.network === 'custom') {
            setCustomRpcValue(cluster.endpoint);
        }
    }, [cluster]);

    const handleCustomRpcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomRpcValue(e.target.value);
    };

    const handleCustomRpcSubmit = () => {
        try {
            // Validate URL
            new URL(customRpcValue);
            setCustomEndpoint(customRpcValue);
            setIsCustomRpcOpen(false);
        } catch (error) {
            console.error('Invalid RPC URL:', error);
        }
    };

    const handleSelectCluster = (selectedCluster: SolanaCluster) => {
        setCluster(selectedCluster);
    };

    useEffect(() => {
        // Initial prices from CoinGecko API as fallback
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd')
            .then(response => response.json())
            .then(data => {
                const updatedPrices = { ...cryptoPrices };

                if (data.solana) {
                    updatedPrices.sol.price = data.solana.usd.toFixed(2);
                }

                if (data.bitcoin) {
                    updatedPrices.btc.price = data.bitcoin.usd.toFixed(0);
                }

                if (data.ethereum) {
                    updatedPrices.eth.price = data.ethereum.usd.toFixed(0);
                }

                setCryptoPrices(updatedPrices);
            })
            .catch(error => {
                console.error('Error fetching initial prices:', error);
            })
            .finally(() => {
                setLoading(false);
            });

        // Setup WebSocket connections for live price updates
        const websockets: Record<string, WebSocket | null> = {
            sol: null,
            btc: null,
            eth: null
        };

        // Function to create WebSocket connection for a crypto pair
        const createWebSocket = (symbol: 'sol' | 'btc' | 'eth', wsSymbol: string): WebSocket | null => {
            try {
                const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@ticker`);

                ws.onopen = () => {
                    console.log(`Connected to Binance WebSocket for ${symbol}`);
                    setCryptoPrices(prev => ({
                        ...prev,
                        [symbol]: { ...prev[symbol], connected: true }
                    }));
                };

                ws.onmessage = (event: MessageEvent) => {
                    try {
                        const data: BinanceTickerData = JSON.parse(event.data);
                        if (data && data.c) {
                            setCryptoPrices(prev => ({
                                ...prev,
                                [symbol]: {
                                    ...prev[symbol],
                                    price: symbol === 'sol'
                                        ? parseFloat(data.c).toFixed(2)
                                        : parseFloat(data.c).toFixed(0)
                                }
                            }));
                        }
                    } catch (error) {
                        // Silently handle parsing errors
                        // console.error(`Error parsing WebSocket data for ${symbol}:`, error);
                    }
                };

                ws.onerror = (error: Event) => {
                    // Don't log empty error objects, which happen during normal operation
                    if (error && Object.keys(error).length > 0) {
                        console.error(`WebSocket error for ${symbol}:`, error);
                    }

                    setCryptoPrices(prev => ({
                        ...prev,
                        [symbol]: { ...prev[symbol], connected: false }
                    }));
                };

                ws.onclose = () => {
                    // Don't log normal closures
                    // console.log(`WebSocket connection closed for ${symbol}`);
                    setCryptoPrices(prev => ({
                        ...prev,
                        [symbol]: { ...prev[symbol], connected: false }
                    }));
                };

                return ws;
            } catch (error) {
                console.error(`Error creating WebSocket for ${symbol}:`, error);
                return null;
            }
        };

        // Create WebSocket connections for each crypto
        websockets.sol = createWebSocket('sol', 'solusdt');
        websockets.btc = createWebSocket('btc', 'btcusdt');
        websockets.eth = createWebSocket('eth', 'ethusdt');

        // Clean up WebSocket connections on component unmount
        return () => {
            Object.values(websockets).forEach(ws => {
                if (ws) ws.close();
            });
        };
    }, []);

    // Function to render price info for a cryptocurrency with specific colors
    const renderCryptoPrice = (
        crypto: 'sol' | 'btc' | 'eth',
        icon: React.ReactNode,
        textColorClass: string
    ): React.ReactNode => {
        const { price } = cryptoPrices[crypto];

        return (
            <div className="flex items-center gap-2">
                {icon}
                <div className="flex items-center">
                    {loading ? (
                        <div className="w-12 h-4 bg-gray-700 animate-pulse rounded"></div>
                    ) : (
                        <>
                            <span className={`font-thin text-xs ${textColorClass}`}>
                                ${formatPrice(price, crypto)}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Function to render server status
    const renderServerStatus = () => {
        if (serverStatus === 'loading') {
            return (
                <div className="flex items-center gap-1 bg-red-300/10 px-2 py-1 rounded-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-xs text-red-500">Disconnected</span>
                </div>
            );
        } else if (serverStatus === 'operational') {
            return (
                <div className="flex items-center gap-1 bg-green-300/10 px-2 py-1 rounded-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500">
                    </div>
                    <span className="text-xs text-green-500">Connected</span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-1 bg-red-300/10 px-2 py-1 rounded-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-xs text-red-500">Disconnected</span>
                </div>
            );
        }
    };

    // Network dropdown menu
    const renderNetworkSelector = () => {
        const networkColors = {
            'mainnet-beta': 'text-green-500',
            'devnet': 'text-orange-500',
            'testnet': 'text-blue-500',
            'custom': 'text-purple-500'
        };

        const displayName =
            cluster.network === 'mainnet-beta' ? 'Mainnet' :
                cluster.network === 'custom' ? 'Custom RPC' :
                    cluster.network.charAt(0).toUpperCase() + cluster.network.slice(1);

        const textColor = networkColors[cluster.network as keyof typeof networkColors] || 'text-gray-400';

        return (
            <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-sm border border-zinc-700/50 px-2 py-1 bg-zinc-800/90 hover:bg-zinc-700/90 transition-colors">
                    <span className={`text-xs font-medium ${textColor}`}>{displayName}</span>
                    <ChevronUp className="h-3 w-3 text-zinc-400" />
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="z-50 min-w-[220px] bg-zinc-800 border border-zinc-700">
                    <DropdownMenuRadioGroup value={cluster.network} onValueChange={(value) => {
                        // Find the cluster object and set it
                        const selectedCluster = CLUSTERS.find(c => c.network === value);
                        if (selectedCluster) {
                            handleSelectCluster(selectedCluster);
                        }
                    }}>
                        {CLUSTERS.filter(c => c.network !== 'custom').map((networkOption) => (
                            <DropdownMenuRadioItem
                                key={networkOption.network}
                                value={networkOption.network}
                                className={cn(
                                    "cursor-pointer text-white",
                                    cluster.network === networkOption.network ? 'bg-zinc-700' : ''
                                )}
                            >
                                <span className={networkColors[networkOption.network as keyof typeof networkColors]}>
                                    {networkOption.network === 'mainnet-beta' ? 'Mainnet' :
                                        networkOption.network.charAt(0).toUpperCase() + networkOption.network.slice(1)}
                                </span>
                                {cluster.network === networkOption.network && (
                                    <Check className="ml-auto h-4 w-4 text-zinc-400" />
                                )}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>

                    <DropdownMenuSeparator className="bg-zinc-700" />

                    {/* Custom RPC option */}
                    <div className="px-2 py-1.5">
                        <button
                            className={cn(
                                "w-full text-left text-xs rounded px-2 py-1 transition-colors",
                                cluster.network === 'custom' ? 'bg-zinc-700 text-purple-500' : 'text-white hover:bg-zinc-700/70'
                            )}
                            onClick={() => setIsCustomRpcOpen(!isCustomRpcOpen)}
                        >
                            <div className="flex items-center justify-between">
                                <span>Custom RPC</span>
                                {cluster.network === 'custom' && (
                                    <Check className="ml-auto h-4 w-4 text-zinc-400" />
                                )}
                            </div>
                        </button>

                        {isCustomRpcOpen && (
                            <div className="mt-2 px-2">
                                <input
                                    type="text"
                                    value={customRpcValue}
                                    onChange={handleCustomRpcChange}
                                    className="w-full text-xs p-1.5 bg-zinc-900 border border-zinc-700 rounded text-white"
                                    placeholder="Enter RPC URL"
                                />
                                <button
                                    className="mt-1 w-full text-xs bg-zinc-900 hover:bg-zinc-700 text-white py-1 rounded border border-zinc-700"
                                    onClick={handleCustomRpcSubmit}
                                >
                                    Connect
                                </button>
                            </div>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 h-8 backdrop-blur-sm border-t border-[#5b6075]/30 flex items-center justify-between px-4 z-20">
            {/* Crypto Prices */}
            <div className="flex items-center gap-4 text-xs">
                {renderCryptoPrice('btc', <FaBitcoin className="w-4 h-4 text-yellow-500" />, 'text-yellow-500')}
                {renderCryptoPrice('eth', <SiEthereum className="w-4 h-4 text-gray-500" />, 'text-gray-500')}
                {renderCryptoPrice('sol', <SolanaIcon className="w-4 h-4 text-emerald-400" />, 'text-emerald-400')}
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-3">
                {/* Network Selector Dropdown */}
                {renderNetworkSelector()}

                {/* Server Status */}
                {renderServerStatus()}

                <Link href="https://twitter.com/bundlerdotspace" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <FaXTwitter className="w-4 h-4" title="Twitter" />
                </Link>
                <Link href="https://discord.gg/HGFf7NNHrp" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <FaDiscord className="w-4 h-4" title="Discord" />
                </Link>
                <Link href="https://docs.bundler.space" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <span className='flex items-center gap-2'>
                        <FaBook className="w-4 h-4" title="Docs" />
                        <span className='text-xs'>
                            Docs
                        </span>
                    </span>
                </Link>
            </div>
        </div>
    );
};

export default BottomBar;