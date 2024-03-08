import * as Token from '@solana/spl-token-2';
import { PublicKey, SimulatedTransactionAccountInfo } from '@solana/web3.js';

const TIP_ACCOUNTS = [
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'
].map((pubkey) => new PublicKey(pubkey));

export const getRandomTipAccount = () => TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)];

export function unpackTokenAccount(pubkey: PublicKey, accountInfo: SimulatedTransactionAccountInfo): Token.Account {
  const data = Buffer.from(accountInfo.data[0], 'base64');
  const tokenAccountInfo = Token.unpackAccount(pubkey, {
    data,
    executable: accountInfo.executable,
    lamports: accountInfo.lamports,
    owner: new PublicKey(accountInfo.owner),
    rentEpoch: accountInfo.rentEpoch
  });

  return tokenAccountInfo;
}
