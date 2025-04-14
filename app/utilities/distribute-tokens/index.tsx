import { getHeaderLayout } from "@/components/header-layout";
import TokenDistributor from "./TokenDistributor";
import { ReactNode } from "react";
import React from 'react';

export const TokenDistributorPage = () => {
    return (
        <div className="flex justify-center items-center">
            <div className="space-y-4 mt-10 mb-8 w-2/3">
                <div className="md:grid md:gap-6">
                    <div className="">
                        <TokenDistributor />
                    </div>
                </div>
            </div>
        </div>
    );
};

TokenDistributorPage.getLayout = (page: ReactNode) => getHeaderLayout(page, "Token Distributor");

export default TokenDistributorPage; 