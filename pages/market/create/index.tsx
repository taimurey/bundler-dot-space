import React from 'react';
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// import { RadioGroup } from "@headlessui/react";
// import { DexInstructions, Market } from "@project-serum/serum";
import {
  ACCOUNT_SIZE,
  // createInitializeAccountInstruction,
  // createInitializeMintInstruction,
  // getMinimumBalanceForRentExemptMint,
  getMint,
  MINT_SIZE,
  // TOKEN_PROGRAM_ID,
} from "@solana/spl-token-2";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  // ComputeBudgetProgram,
  // Keypair,
  PublicKey,
  // SystemProgram,
  // Transaction,
  // TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import ReactTooltip from "react-tooltip";
import { useRouter } from "next/router";
import { ReactNode, useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
// import { TransactionToast } from "../../../components/common/Toasts/TransactionToast";
import AdvancedOptionsForm from "../../../components/createMarket/AdvancedOptionsForm";
// import CreateMintOption from "../../../components/createMarket/CreateMintOption";
import ExistingMintForm from "../../../components/createMarket/ExistingMintForm";
// import NewMintForm from "../../../components/createMarket/NewMintForm";
import TickerForm from "../../../components/createMarket/TickerForm";
import { getHeaderLayout } from "../../../components/layouts/HeaderLayout";
// import { useSerum } from "../../../components/context";
import { tokenAtomicsToPrettyDecimal } from "../../../utils/numerical";
import {
  EVENT_QUEUE_LENGTH,
  // getVaultOwnerAndNonce,
  ORDERBOOK_LENGTH,
  REQUEST_QUEUE_LENGTH,
} from "../../../utils/serum";
// import {
//   sendSignedTransaction,
//   signTransactions,
//   TransactionWithSigners,
// } from "../../../utils/transaction";
import useSerumMarketAccountSizes from "../../../utils/hooks/useSerumMarketAccountSizes";
import useRentExemption from "../../../utils/hooks/useRentExemption";
import { createMarket } from '../../../components/market/marketInstruction';

// const TRANSACTION_MESSAGES = [
//   {
//     sendingMessage: "Creating mints.",
//     successMessage: "Created mints successfully.",
//   },
//   {
//     sendingMessage: "Creating vaults.",
//     successMessage: "Created vaults successfully.",
//   },
//   {
//     sendingMessage: "Creating market.",
//     successMessage: "Created market successfully.",
//   },
// ];

type NewMintFormValues = {
  baseDecimals: number;
  quoteDecimals: number;
  baseAuthority: string;
  quoteAuthority: string;
};

type ExistingMintFormValues = {
  baseMint: string;
  quoteMint: string;
};

export type CreateMarketFormValues = {
  createMint: boolean;
  newMints?: NewMintFormValues;
  existingMints?: ExistingMintFormValues;
  lotSize: number;
  useAdvancedOptions: boolean;
  tickSize: number;
  eventQueueLength: number;
  requestQueueLength: number;
  orderbookLength: number;
};

const CreateMarket = () => {
  const router = useRouter();
  // const { String: token } = router.query;
  // const token = router.query.token as string | undefined;
  // const [token, setToken] = React.useState<string | undefined>(router.query.token as string | undefined);
  const { connection } = useConnection();
  const wallet = useWallet();
  const { signAllTransactions } = useWallet();

  // const { programID } = useSerum();

  const { register, handleSubmit, watch, setValue, formState, clearErrors } =
    useForm<CreateMarketFormValues>({
      defaultValues: {
        createMint: true,
      },
    });
  // const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setToken(event.target.value);
  // };
  const createMint = watch("createMint");
  const useAdvancedOptions = watch("useAdvancedOptions");

  const eventQueueLength = watch("eventQueueLength");
  const requestQueueLength = watch("requestQueueLength");
  const orderbookLength = watch("orderbookLength");

  const mintRent = useRentExemption(createMint ? MINT_SIZE : 0);
  const vaultRent = useRentExemption(ACCOUNT_SIZE);

  const {
    marketRent,
    totalEventQueueSize,
    totalOrderbookSize,
    totalRequestQueueSize,
  } = useSerumMarketAccountSizes({
    eventQueueLength,
    requestQueueLength,
    orderbookLength,
  });

  useEffect(() => {
    if (!useAdvancedOptions) {
      setValue("eventQueueLength", EVENT_QUEUE_LENGTH);
      setValue("requestQueueLength", REQUEST_QUEUE_LENGTH);
      setValue("orderbookLength", ORDERBOOK_LENGTH);
    }
  }, [useAdvancedOptions, setValue]);

  useEffect(() => {
    if (createMint) {
      setValue("existingMints", undefined);
      clearErrors("existingMints");
    } else {
      setValue("newMints", undefined);
      clearErrors("newMints");
    }
  }, [createMint, setValue, clearErrors]);

  // TODO: refactor somewhere else
  const handleCreateMarket: SubmitHandler<CreateMarketFormValues> = async (
    data
  ) => {
    if (!wallet || !wallet.publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    // let baseMintKeypair: Keypair | undefined;
    let baseMint: PublicKey;

    // let quoteMintKeypair: Keypair | undefined;
    // let quoteMint: PublicKey;

    // const mintInstructions: TransactionInstruction[] = [];
    // const mintSigners: Keypair[] = [];

    // validate existing mints

    try {
      const baseMintInfo = await getMint(
        connection,
        new PublicKey(data.existingMints!.baseMint)
      );


      baseMint = baseMintInfo.address;



      // const quoteMintInfo = await getMint(
      //   connection,
      //   new PublicKey(data.existingMints!.quoteMint)
      // );
      // quoteMint = quoteMintInfo.address;
    } catch (e) {
      toast.error("Invalid mints provided.");
      return;
    }



    try {
      let accounts;
      try {
        accounts = await createMarket(baseMint, wallet.publicKey, 1000000, signAllTransactions, data);
      } catch (e) {
        console.error("[explorer]: ", e);
        toast.error("Failed to create market.");
      }

      if (!accounts) {
        return;
      }


      router.push({
        pathname: `${accounts.marketId.toBase58()}`,
        query: router.query,
      });
    } catch (e) {
      console.error("[explorer]: ", e);
      toast.error("Failed to create market.");
    }
  }


  return (
    <>
      <div className="space-y-4 mb-6 w-2/3 ml-24">
        {/* <div>
          <h1 className="text-2xl text-white">Create Market</h1>
        </div> */}
        <form onSubmit={handleSubmit(handleCreateMarket)}>
          <div className="space-y-4 ">
            <h1 className='font-[kanit-medium] text-[35px]'>
              Create Market
            </h1>


            <div className="bg-[#0c0e11] border border-neutral-600 shadow-2xl shadow-black px-4 py-5 rounded-lg sm:p-6">


              <div className="md:grid md:grid-cols-3 md:gap-6">

                <div className="md:col-span-1">

                  <h3 className="text-lg font-medium leading-6 text-white">
                    Mints
                  </h3>
                  <p className="mt-1 text-sm text-white">
                    Configure the mints for the tokens you want to create a
                    market for.
                  </p>
                </div>
                <div className="mt-5 space-y-4 md:col-span-2 md:mt-0">
                  <div>

                  </div>
                  <div>
                    {/* {createMint ? (
                      <NewMintForm
                        register={register}
                        formState={formState}
                        setValue={setValue}
                      />
                    ) : (
                     
                    )} */}
                    <ExistingMintForm
                      register={register}
                      formState={formState}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#0c0e11] border border-neutral-700 px-4 py-5 shadow rounded-lg sm:p-6">
              <div className="md:grid md:grid-cols-3 md:gap-6">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-medium leading-6 text-white">
                    Tickers
                  </h3>
                  <p className="mt-1 text-sm text-white">
                    Configure the tick sizes, or lowest representable quantities
                    of base and quote tokens.
                  </p>
                </div>
                <div className="mt-5 space-y-4 md:col-span-2 md:mt-0">
                  <TickerForm register={register} />
                </div>
              </div>
            </div>
            <div className="bg-[#0c0e11] border border-neutral-700 px-4 py-5 shadow rounded-lg sm:p-6">
              <div className="md:grid md:grid-cols-3 md:gap-6">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-medium leading-6 text-white">
                    Advanced Options
                  </h3>
                  <p className="mt-1 text-sm text-white">
                    Configure sizes for the different accounts used to create
                    the market to adjust rent cost.
                  </p>
                  <div className="mt-6">
                    <div className="mb-1 flex items-center space-x-1">
                      <p className="text-xs text-white">
                        Total Rent Estimate{" "}
                      </p>
                    </div>

                    <p className="text-lg btn-text-gradient font-bold">
                      {tokenAtomicsToPrettyDecimal(
                        new BN(marketRent + vaultRent * 2 + mintRent * 2 /*+ 200000000*/),
                        9
                      )}{" "}
                      SOL{" "}
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-4 md:col-span-2 md:mt-0">
                  <AdvancedOptionsForm
                    useAdvancedOptions={useAdvancedOptions}
                    register={register}
                    setValue={setValue}
                    formState={formState}
                    totalMarketAccountSizes={{
                      totalEventQueueSize,
                      totalRequestQueueSize,
                      totalOrderbookSize,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end w-full">
              <button className="w-full md:max-w-xs rounded-lg p-2 bg-emerald-500 hover:bg-emerald-800 duration-300 ease-in-out transition-colors disabled:opacity-20">
                Create
              </button>
            </div>
          </div>
        </form>
      </div>
      <ReactTooltip place="right" />
    </>
  );
};

CreateMarket.getLayout = (page: ReactNode) =>
  getHeaderLayout(page, "Create Market");

export default CreateMarket;