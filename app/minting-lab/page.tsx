import { redirect } from "next/navigation";

export default function MintingLabPage() {
    redirect("/mintinglab/create-token");
    return null;
} 