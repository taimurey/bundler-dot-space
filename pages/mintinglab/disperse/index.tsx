import { useWallet } from "@solana/wallet-adapter-react";
import { getHeaderLayout } from "../../../components/layouts/HeaderLayout";
import { ReactNode, useEffect, useState } from "react";
import { connection } from "../../../components/removeLiquidity/config";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { toast } from "react-toastify";
import { truncate } from '../../../components/common/Allprofiles';
import { TokenDisperser } from "../../../components/DistributeTokens/distributor";

export const Create = () => {
    const [selectedTokenAddr, setSelectedTokenAddr] = useState<string>(''); // State for selected token address
    const [walletAddresses, setWalletAddresses] = useState<string>(''); // State for wallet addresses
    const [tokenAccounts, setTokenAccounts] = useState<string[]>([]); // Array of token accounts
    const wallet = useWallet();
    const { signAllTransactions } = useWallet();
    const [selectedButton, setSelectedButton] = useState<string>('');
    const [Smint, setMint] = useState<string[]>([]);

    const publicKey = wallet.publicKey;
    useEffect(() => {
        if (!publicKey) {
            return
        }
        const fetchTokenAccounts = async () => {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
            const tokenAccountsArray = tokenAccounts.value.map(account => account.pubkey.toBase58());
            const tokenmint = tokenAccounts.value.map(account => account.account.data.parsed.info.mint);
            const decimalsArray = tokenAccounts.value.map(account => account.account.data.parsed.info.decimals);
            const mint = tokenAccounts.value.map(account => account.account.data.parsed.info.mint);
            console.log(`${tokenAccountsArray}\n${decimalsArray}\n${mint}`);

            setMint(mint);
            setTokenAccounts(tokenmint);
        }

        fetchTokenAccounts();

    }, [publicKey]);

    const handleSend = () => {
        if (!publicKey) {
            toast.error('Please connect your wallet');
            return
        }

        if (!walletAddresses) {
            toast.error('Please enter wallet addresses to distribute tokens');
            return
        }
        // Split walletAddresses by line space to get an array of wallet addresses
        const walletAddressesArray = walletAddresses.split('\n');


        // Get the decimals of the selected token account
        const mint = selectedTokenAddr;


        TokenDisperser(walletAddressesArray, signAllTransactions, publicKey, mint);
    };

    return (
        <div className="w-2/3  flex flex-col  items-center ml-5">
            <h1 className="font-bold text-zinc-200 text-[35px]">
                Token Distributor
            </h1>
            <h3 className=" text-zinc-400 text-[20px] font-medium">
                Distribute tokens to multiple wallets in single click
            </h3>


            <div className="relative rounded-md shadow-sm w-2/3 flex justify-end mt-10">
                <select
                    id="TokenAddressSelection"
                    value={selectedTokenAddr}
                    onChange={e => setSelectedTokenAddr(e.target.value)}
                    required={true}
                    className="block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                >
                    <option value="" disabled>
                        Select Token Address
                    </option>
                    {tokenAccounts.map((account, index) => (
                        <option key={index} value={account}>
                            {account}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex justify-between w-2/3 mt-5 gap-4">
                <button
                    className={`font-bold rounded-xl h-[40px] hover:border-[#00ffdd] px-5 flex justify-center items-center border text-[16px] duration-200 ease-in-out
                     w-full ${selectedButton === 'random' ? 'border-[#00e1ffbd] border-2' : ''}`}
                    onClick={() => setSelectedButton('random')}
                >
                    <span className=''>Random Amount</span>
                </button>
                <button
                    className={`font-bold rounded-xl h-[40px] hover:border-[#00ffdd] px-5 flex justify-center items-center border text-[16px] duration-200 ease-in-out
                     w-full ${selectedButton === 'equal' ? 'border-[#00e1ffbd] border-2' : ''}`}
                    onClick={() => setSelectedButton('equal')}
                >
                    <span className=''>Equal Amount</span>
                </button>
            </div>
            <textarea
                className="w-full h-64 p-3 border-2 border-[#2b2c35] bg-[#0c0e11] rounded-md mt-5"
                placeholder="Enter Wallets here..."
                value={walletAddresses}
                onChange={e => setWalletAddresses(e.target.value)}
            ></textarea>
            <button
                className="invoke-btn flex justify-center items-center w-1/3"
                onClick={handleSend}
            >
                <span className='btn-text-gradient'>Send Tokens</span>
            </button>
        </div>
    );
};
Create.getLayout = (page: ReactNode) => getHeaderLayout(page, "Create");

export default Create;