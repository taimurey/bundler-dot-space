import { useSolana } from "../../context";
import { getExplorerLink } from "../../../utils/general";

type TransactionSuccessProps = {
  txSig: string;
  message: string;
};

export function TransactionToast({
  txSig,
  message,
}: TransactionSuccessProps) {
  const { cluster } = useSolana();
  return (
    <div className="flex flex-col space-y-1">
      <p>{message}</p>
      <a
        href={getExplorerLink(txSig, cluster.network)}
        target="_blank"
        rel="noopener noreferrer"
        className="italic font-light text-sm"
      >
        View transaction
      </a>
    </div>
  );
}

export function LinkToast({
  link,
  message,
}: {
  link: string;
  message: string;
}) {

  return (
    <div className="flex flex-col space-y-1">
      <p>{message}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="italic font-light text-sm"
      >
        View {message}
      </a>
    </div>
  );
}


export function BundleToast({
  txSig,
  message,
}: TransactionSuccessProps) {
  return (
    <div className="flex flex-col space-y-1">
      <p>{message}</p>
      <a
        href={`https://explorer.jito.wtf/bundle/${txSig}`}
        target="_blank"
        rel="noopener noreferrer"
        className="italic font-light text-sm"
      >
        View transaction
      </a>
    </div>
  );
}