'use client';

import React from "react";
import LaunchLabClient from "./launch-lab-client";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full h-full">
            {children}
        </div>
    );
} 