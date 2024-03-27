import { useState } from "react";
import CreateToken from "./token/CreateToken";
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
                        <RadioGroup value={selectedOption} onChange={setSelectedOption} className="flex space-x-4">
                            <RadioGroup.Option
                                value={false}
                                className="flex-1 focus-style rounded-md cursor-pointer hover:bg-blue-500"
                            >
                                {({ active, checked }) => (
                                    <CreateMintOption active={active} checked={checked}>
                                        <RadioGroup.Label>
                                            Create Token
                                        </RadioGroup.Label>
                                    </CreateMintOption>
                                )}
                            </RadioGroup.Option>
                            <RadioGroup.Option
                                value={true}
                                className="flex-1 focus-style rounded-md cursor-pointer hover:bg-blue-500"
                            >
                                {({ active, checked }) => (
                                    <CreateMintOption active={active} checked={checked}>
                                        <RadioGroup.Label>
                                            Token Manager
                                        </RadioGroup.Label>
                                    </CreateMintOption>
                                )}
                            </RadioGroup.Option>
                        </RadioGroup>
                        <div className="md:grid md:gap-6">
                            <div className="">
                                {selectedOption ? <RevokeAuthorities /> : <CreateToken />}
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