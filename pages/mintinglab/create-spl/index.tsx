import CreateToken from "./token/CreateToken";
import { getHeaderLayout } from "../../../components/layouts/HeaderLayout";
import { ReactNode } from "react";
import React from 'react';
export const Create = () => {

    return (
        <div className="flex justify-center items-center">

            <div className="space-y-4 mt-10 mb-8 w-2/3">
                <form>
                    <div className="md:grid md:gap-6">
                        <div className="">
                            <CreateToken />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

Create.getLayout = (page: ReactNode) => getHeaderLayout(page, "Create");

export default Create;