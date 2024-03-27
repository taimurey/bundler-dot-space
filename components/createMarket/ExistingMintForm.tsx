import { FormState, UseFormRegister } from "react-hook-form";
import { CreateMarketFormValues } from "../../pages/market/create";
import { validatePubkey } from "../../utils/pubkey";

type ExistingMintFormProps = {
  register: UseFormRegister<CreateMarketFormValues>;
  formState: FormState<CreateMarketFormValues>;
  Token: string | undefined;
};
export default function ExistingMintForm({
  register,
  formState: { errors },
  Token,
  handleInputChange // Removed unused Change prop
}: ExistingMintFormProps & { handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  // Register the input fields and get the onChange handlers
  const { onChange: onChangeBaseMint } = register("existingMints.baseMint", {
    required: true,
    validate: validatePubkey,
  });
  const { onChange: onChangeQuoteMint } = register("existingMints.quoteMint", {
    required: true,
    validate: validatePubkey,
  });

  // Create new onChange handlers that call both handleInputChange and the onChange handlers from register
  const handleBaseMintChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(event);
    onChangeBaseMint(event);
  };
  const handleQuoteMintChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(event);
    onChangeQuoteMint(event);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-white">Base Mint</label>
        <div className="mt-1">
          <input
            type="text"
            value={Token || ''}
            className="block w-full rounded-md p-2 bg-neutral-700 focus-style sm:text-sm"
            onChange={handleBaseMintChange} // Use the new onChange handler
          />
          {errors?.existingMints?.baseMint ? (
            <p className="text-xs text-red-400 mt-1">
              {errors?.existingMints?.baseMint?.message}
            </p>
          ) : null}
        </div>
      </div>
      <div>
        <label className="block text-xs text-white">Quote Mint</label>
        <div className="mt-1">
          <input
            type="text"
            className="block w-full rounded-md p-2 bg-neutral-700 focus-style sm:text-sm"
            onChange={handleQuoteMintChange} // Use the new onChange handler
          />
          {errors?.existingMints?.quoteMint ? (
            <p className="text-xs text-red-400 mt-1">
              {errors?.existingMints?.quoteMint?.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
