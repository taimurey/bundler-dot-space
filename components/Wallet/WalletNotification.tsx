import { toast } from 'sonner';
import 'twin.macro'

import { IUnifiedWalletConfig, IWalletNotification } from '../../context/WalletConnectionProvider';

const WalletNotification: IUnifiedWalletConfig['notificationCallback'] = {
  onConnect: (props: IWalletNotification) => {
    toast.success(
      <div className="flex flex-col bg-green-100 w-full p-4">
        <span className="font-semibold">Wallet Connected</span>
        <span className="text-xs text-black/50">{`Connected to wallet ${props.shortAddress}`}</span>
      </div>,
      {
        style: {
          padding: 0,
          margin: 0,
        }
      });
  },
  onConnecting: (props: IWalletNotification) => {
    toast.message(
      <div className="flex flex-col p-4">
        <span className="font-semibold">Connecting to {props.walletName}</span>
      </div>,
      {
        style: {
          padding: 0,
          margin: 0,
        }
      });
  },
  onDisconnect: (props: IWalletNotification) => {
    toast.message(
      <div className="flex flex-col p-4">
        <span className="font-semibold">Disconnected from {props.walletName}</span>
        <span className="text-xs text-black/50">{`Disconnected from wallet ${props.shortAddress}`}</span>
      </div>,
      {
        style: {
          padding: 0,
          margin: 0,
        }
      });
  },
  onNotInstalled: (props: IWalletNotification) => {
    toast.error(
      <div className="flex flex-col bg-red-100 w-full p-4">
        <span className="font-semibold">{props.walletName} Wallet is not installed</span>
        <span>
          {`Please go to the provider`}{' '}
          <a target="_blank" rel="noopener noreferrer" className="underline font-bold" href={props.metadata.url}>
            {`website`}
          </a>{' '}
          {`to download.`}
        </span>
      </div>,
      {
        style: {
          padding: 0,
          margin: 0,
        }
      });
  },
}

export default WalletNotification;
