'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaBook, FaDiscord, FaXTwitter } from 'react-icons/fa6';
import { IoDocumentText } from 'react-icons/io5';
import SolanaIcon from './icons/SolanaIcon';
import { FaBitcoin } from 'react-icons/fa';
import { SiEthereum } from 'react-icons/si';

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

const BottomBar: React.FC = () => {
    // State for cryptocurrency prices
    const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
        sol: { price: '--', connected: false },
        btc: { price: '--', connected: false },
        eth: { price: '--', connected: false }
    });
    const [loading, setLoading] = useState<boolean>(true);

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
                        console.error(`Error parsing WebSocket data for ${symbol}:`, error);
                    }
                };

                ws.onerror = (error: Event) => {
                    console.error(`WebSocket error for ${symbol}:`, error);
                    setCryptoPrices(prev => ({
                        ...prev,
                        [symbol]: { ...prev[symbol], connected: false }
                    }));
                };

                ws.onclose = () => {
                    console.log(`WebSocket connection closed for ${symbol}`);
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
                                ${price}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#0d1117]/95 backdrop-blur-sm border-t border-[#5b6075]/30 flex items-center justify-between px-4 z-20">
            {/* Crypto Prices */}
            <div className="flex items-center gap-4 text-xs">
                {renderCryptoPrice('btc', <FaBitcoin className="w-4 h-4 text-yellow-500" />, 'text-yellow-500')}
                {renderCryptoPrice('eth', <SiEthereum className="w-4 h-4 text-gray-500" />, 'text-gray-500')}
                {renderCryptoPrice('sol', <SolanaIcon />, 'text-emerald-400')}
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-3">
                <Link href="https://twitter.com/bundlerdotspace" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <FaXTwitter className="w-4 h-4" title="Twitter" />
                </Link>
                <Link href="https://discord.gg/HGFf7NNHrp" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                    <FaDiscord className="w-4 h-4" title="Discord" />
                </Link>
                <Link href="https://docs.bundler.space" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5b6075] transition-colors">
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