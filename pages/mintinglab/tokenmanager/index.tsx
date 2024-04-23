import { useState } from "react";
import { getHeaderLayout } from "../../../components/layouts/HeaderLayout";
import { ReactNode } from "react";
import { RadioGroup } from "@headlessui/react";
import CreateMintOption from "../../../components/createMarket/CreateMintOption";
import React from 'react';
import RevokeAuthorities from "./metadata";
export const Create = () => {
    const [selectedOption, setSelectedOption] = useState(false);

    return (
        <div className="flex justify-center items-center">
            <div className="space-y-4 mt-10 mb-8 w-2/3">
                <form>
                    <div className="bg-[#0c0e11] border border-neutral-600 px-4 py-5 shadow-2xl shadow-black rounded-lg sm:p-6 ">
                        <div className="md:grid md:gap-6">
                            <div className="">
                                <RevokeAuthorities />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

Create.getLayout = (page: ReactNode) => getHeaderLayout(page, "Create");

export default Create;