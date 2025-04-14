import { getHeaderLayout } from "../../../components/header-layout";
import { ReactNode } from "react";
import React from 'react';
import TokenManagerPage from "./page";

export const Create = () => {
    return (
        <div className="flex justify-center items-center">
            <div className="space-y-4 mt-10 mb-8 w-full">
                <TokenManagerPage />
            </div>
        </div>
    );
};

Create.getLayout = (page: ReactNode) => getHeaderLayout(page, "Authority Manager");

export default Create;