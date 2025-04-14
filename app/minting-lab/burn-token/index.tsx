import { getHeaderLayout } from "@/components/header-layout";
import BurnToken from "./BurnToken";
import { ReactNode } from "react";
import React from 'react';

export const BurnTokenPage = () => {

    return (
        <div className="flex justify-center items-center">
            <div className="space-y-4 mt-10 mb-8 w-2/3">
                <div className="md:grid md:gap-6">
                    <div className="">
                        <BurnToken />
                    </div>
                </div>
            </div>
        </div>
    );
};

BurnTokenPage.getLayout = (page: ReactNode) => getHeaderLayout(page, "Burn Tokens");

export default BurnTokenPage; 