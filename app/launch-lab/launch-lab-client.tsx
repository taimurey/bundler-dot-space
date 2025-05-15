'use client';
import React from 'react';

const LaunchLabClient = () => {
    return (
        <div className="flex items-center justify-center h-full min-h-[80vh]">
            <div className="text-center text-white/70">
                <h1 className="text-2xl font-semibold mb-4">Launch Lab Tools</h1>
                <p>Select a tool from the sidebar to get started</p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                    <div className="bg-[#0c0e11] p-4 rounded-md border border-neutral-800">
                        <h3 className="text-lg font-medium text-white mb-2">Create</h3>
                        <p className="text-sm text-white/60">Create and deploy a new token with customizable parameters</p>
                    </div>
                    <div className="bg-[#0c0e11] p-4 rounded-md border border-neutral-800">
                        <h3 className="text-lg font-medium text-white mb-2">Manage</h3>
                        <p className="text-sm text-white/60">Manage your existing tokens with buy and sell operations</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaunchLabClient; 