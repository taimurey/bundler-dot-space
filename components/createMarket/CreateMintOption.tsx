import { ReactNode } from "react";
import { classNames } from "../../utils/general";

export default function CreateMintOption({
  active,
  checked,
  children,
}: {
  active: boolean;
  checked: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={classNames(
        "p-2 flex-1 border border-neutral-500 rounded-md flex items-center justify-center text-sm",
        active
          ? "bg-neutral-900 border-neutral-500"
          : "bg-neutral-900 border-neutral-500",
        checked ? "border-custom-green-500 text-custom-green" : "text-white"
      )}
    >
      {children}
    </div>
  );
}
