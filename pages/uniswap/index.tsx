import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Pair, Route, Token, TokenAmount, Trade, TradeType } from '@uniswap/sdk';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

const DAI = new Token(1, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin');
const WETH = new Token(1, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');

const pair = new Pair(new TokenAmount(DAI, '2000000000000000000'), new TokenAmount(WETH, '1000000000000000000'));

const RemoveLiquidity = () => {
    const [amount, setAmount] = useState('');

    const removeLiquidity = async () => {
        const route = new Route([pair], WETH);
        const trade = new Trade(route, new TokenAmount(WETH, ethers.utils.parseEther(amount).toString()), TradeType.EXACT_INPUT);

        const slippageTolerance = new Percent('50', '10000'); // 0.50%
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
        const path = [WETH.address, DAI.address];
        const to = await signer.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
        const value = trade.inputAmount.raw;

        const router = new ethers.Contract(
            '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            ['function removeLiquidity(address tokenA, address tokenB, uint amountLiquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)'],
            signer
        );

        const tx = await router.removeLiquidity(
            WETH.address,
            DAI.address,
            ethers.utils.parseEther(amount),
            amountOutMin,
            amountOutMin,
            to,
            deadline,
            { value, gasPrice: 20e9 }
        );

        const receipt = await tx.wait();
        console.log('Transaction was mined in block', receipt.blockNumber);
    };

    return (
        <div>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button onClick={removeLiquidity}>Remove Liquidity</button>
        </div>
    );
};

export default RemoveLiquidity;