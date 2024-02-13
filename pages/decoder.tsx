/* eslint-disable @typescript-eslint/no-explicit-any */
import { decodeInstruction } from "@project-serum/serum";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { getHeaderLayout } from "../components/layouts/HeaderLayout";

type DecoderFormValues = {
  hex: string;
};

const decodeValue = (value: any) => {
  if (value instanceof BN) {
    return value.toString();
  } else if (value instanceof PublicKey) {
    return value.toString();
  } else return value;
};

export default function Decoder() {
  const { register, handleSubmit } = useForm<DecoderFormValues>();

  const [decodedData, setDecodedData] = useState<any>(null);

  const parsedData = useMemo(() => {
    if (!decodedData) return null;

    try {
      return Object.entries(decodedData as object).map(([key, value]) => {
        return {
          instructionName: key,
          data: value,
        };
      })[0];
    } catch (e) {
      return null;
    }
  }, [decodedData]);

  useEffect(() => {
    console.log(parsedData);
  }, [parsedData]);

  const handleDecode: SubmitHandler<DecoderFormValues> = (data) => {
    if (data.hex === "") return;

    try {
      setDecodedData(decodeInstruction(Buffer.from(data.hex, "hex")));
      console.log(decodedData);
    } catch (e) {
      setDecodedData(null);
      toast.error("Invalid data provided.", { autoClose: 3000 });
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div>
        <h1 className="text-2xl text-white">Instruction Data Decoder</h1>
      </div>
      <div>
        <form onSubmit={handleSubmit(handleDecode)} className="space-y-2">
          <label className="input-label">Hex Data</label>
          <textarea
            {...register("hex")}
            className="w-full h-36 bg-neutral-800 text-white rounded-md p-4 border border-neutral-700 focus-style"
          />
          <button type="submit" className="primary-btn focus-style">
            Decode
          </button>
        </form>
      </div>
      <div className="pt-4">
        <div>
          <h3 className="text-lg text-white">Result</h3>
        </div>
        <div className="rounded-md bg-neutral-800 border border-neutral-700 mt-2">
          {!parsedData ? (
            <div className="p-3 text-white">
              <p>null</p>
            </div>
          ) : (
            <ul className="px-3 py-2 divide-y divide-neutral-700">
              <li className="w-full flex items-center justify-between py-2">
                <p className="text-white text-sm md:text-base">
                  instruction
                </p>
                <p className="text-custom-green text-sm md:text-base">
                  {parsedData.instructionName}
                </p>
              </li>
              {Object.entries(parsedData.data).map(([key, value]) => (
                <li
                  key={key}
                  className="w-full flex items-center justify-between py-2"
                >
                  <p className="text-white text-sm md:text-base">{key}</p>
                  {value instanceof Array ? (
                    <div className="flex justify-end flex-col">
                      {value.map((v, i) => (
                        <p
                          key={`${i}-${JSON.stringify(v)}`}
                          className="text-white text-sm md:text-base text-right"
                        >
                          {decodeValue(v)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white text-sm md:text-base">
                      {decodeValue(value)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
Decoder.getLayout = (page: ReactNode) => getHeaderLayout(page, "Create Market");
