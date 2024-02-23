import React, { ReactNode, useCallback } from 'react';
import { SolanaMobileWalletAdapterWalletName } from '@solana-mobile/wallet-adapter-mobile';
import tw, { TwStyle } from 'twin.macro';

import { CurrentUserBadge } from '../CurrentUserBadge';
import { useUnifiedWalletContext, useUnifiedWallet } from '../../../context/UnifiedWalletContext';
import { IUnifiedTheme, MWA_NOT_FOUND_ERROR } from '../../../context/UnifiedWalletContext';
import { useTranslation } from '../../../context/TranslationProvider';
import V2SexyChameleonText from '../SexyChameleonText/V2SexyChameleonText';
const styles: Record<string, { [key in IUnifiedTheme]: TwStyle[] }> = {
  container: {
    light: [tw`bg-white text-black`],
    dark: [tw`bg-[#31333B] text-white`],
    jupiter: [tw`bg-v3-bg text-white`],
  },
};

export const UnifiedWalletButton: React.FC<{
  overrideContent?: ReactNode;
  buttonClassName?: string;
  currentUserClassName?: string;
}> = ({ overrideContent, buttonClassName: className, currentUserClassName }) => {
  const { setShowModal, theme } = useUnifiedWalletContext();
  const { disconnect, connect, connecting, wallet } = useUnifiedWallet();
  const { t } = useTranslation();

  const content = (
    <>
      {connecting && (
        <span tw="text-xs">
          <span>{t(`Connecting...`)}</span>
        </span>
      )}
      {/* Mobile */}
      {!connecting && (
        <span tw="block md:hidden">
          <span>{t(`Connect`)}</span>
        </span>
      )}
      {/* Desktop */}
      {!connecting && (

        <span tw="hidden md:block font-semibold">
          <V2SexyChameleonText>
            <span>{t(`Connect Wallet`)}</span>
          </V2SexyChameleonText>
        </span>
      )}
    </>
  );

  const handleClick = useCallback(async () => {
    try {
      if (wallet?.adapter?.name === SolanaMobileWalletAdapterWalletName) {
        await connect();

        return;
      } else {
        setShowModal(true);
      }
    } catch (error) {
      if (error instanceof Error && error.message === MWA_NOT_FOUND_ERROR) {
        setShowModal(true);
      }
    }
  }, [wallet, connect]);

  return (
    <>
      {!wallet?.adapter.connected ? (
        <div
          css={[
            overrideContent ? undefined : tw`rounded-full text-sm py-3 px-5 font-bold cursor-pointer text-center w-auto hover:shadow-lg`,
            styles.container[theme],
          ]}
          className={className}
          onClick={handleClick}
        >
          {overrideContent || content}
        </div>
      ) : (
        <CurrentUserBadge onClick={disconnect} className={currentUserClassName} />
      )}
    </>
  );
};
