import { useState } from "react";
import UploadView from "./metadata";
import CreateToken from "./token/CreateToken";
import { getHeaderLayout } from "../../components/layouts/HeaderLayout";
import { ReactNode } from "react";
import { RadioGroup } from "@headlessui/react";
import CreateMintOption from "../../components/createMarket/CreateMintOption";
import React from 'react';
import RevokeAuthorities from "./metadata";
export const Create = () => {
    const [selectedOption, setSelectedOption] = useState(false);

    return (
        <div className="space-y-4 mt-10 mb-8 mx-auto flex justify-center items-center">
            <form>
                <div className="space-y-4">
                    <div className="bg-neutral-900 border border-neutral-700 px-4 py-5 shadow rounded-lg sm:p-6 ">

                        <RadioGroup value={selectedOption} onChange={setSelectedOption} className="flex space-x-4">

                            <RadioGroup.Option
                                value={false}
                                className="flex-1 focus-style rounded-md"
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
                                className="flex-1 focus-style rounded-md"
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
                            <div className="mt-5 space-y-4 md:col-span-2 md:mt-0">
                                {selectedOption ? <RevokeAuthorities /> : <CreateToken />}
                            </div>
                        </div>

                    </div>
                </div>
            </form>
        </div>
    );
};

Create.getLayout = (page: ReactNode) => getHeaderLayout(page, "Create");

export default Create;