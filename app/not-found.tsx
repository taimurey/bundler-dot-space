'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
    const [randomMessage, setRandomMessage] = useState('');

    // Array of humorous crypto/Solana related messages
    const messages = [
        "Your tokens went to the moon... just in a different direction.",
        "Looks like this NFT got rug-pulled from our server.",
        "Even Solana validators stay online more often than this page.",
        "This page is more elusive than a low gas fee.",
        "Diamond hands can't hold what doesn't exist.",
        "You found a rare page... so rare it doesn't exist.",
    ];

    useEffect(() => {
        // Choose a random message on component mount
        const randomIndex = Math.floor(Math.random() * messages.length);
        setRandomMessage(messages[randomIndex]);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white">
            <div className="max-w-xl w-full border  rounded-lg p-8 mx-auto shadow-lg">
                <div className="text-center">
                    <div className="flex justify-center mb-6 animate-fade-in">
                        <div className="relative">
                            <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#ffac40] to-[#ff4f40]">404</span>
                            <span className="absolute top-0 left-0 w-full h-full flex items-center justify-center blur-xl opacity-50 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#ffac40] to-[#ff4f40]">404</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-semibold mb-4 text-white animate-fade-in-delay">
                        Page Not Found
                    </h1>

                    <p className="mb-6 text-neutral-400 animate-fade-in-delay-2">
                        {randomMessage}
                    </p>

                    <div className="animate-fade-in-delay-3">
                        <Link href="/">
                            <span className="inline-block bg-gradient-to-r from-[#93c453] to-[#2eec83] px-6 py-3 rounded-md font-medium text-black transition-transform hover:scale-105 hover:shadow-lg">
                                Back to Homepage
                            </span>
                        </Link>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeInDelay {
          0% { opacity: 0; transform: translateY(-10px); }
          50% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeInDelay2 {
          0% { opacity: 0; transform: translateY(-10px); }
          66% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeInDelay3 {
          0% { opacity: 0; transform: translateY(10px); }
          75% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        :global(.animate-fade-in) {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        :global(.animate-fade-in-delay) {
          animation: fadeInDelay 0.8s ease-out forwards;
        }
        
        :global(.animate-fade-in-delay-2) {
          animation: fadeInDelay2 1.2s ease-out forwards;
        }
        
        :global(.animate-fade-in-delay-3) {
          animation: fadeInDelay3 1.5s ease-out forwards;
        }
      `}</style>
        </div>
    );
} 