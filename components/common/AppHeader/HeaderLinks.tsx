import className from 'twin.macro';

import SwapIcon from '../../icons/SwapIcon';
import RepoLogo from '../../icons/RepoLogo';
import DiscordIcon from '../../icons/DiscordIcon';
import LiquidityIcon from '../../icons/LiquidityIcon';

const HeaderLink = ({
  href,
  isActive,
  title,
  icon,
  external = false,
}: {
  href: string;
  isActive: boolean;
  title: string | React.ReactNode;
  icon: React.ReactNode;
  external?: boolean;
}) => {
  return (
    <a
      href={href}
      css={[
        className`
          flex items-center font-semibold text-white/50 hover:text-white fill-current h-[60px] px-4 rounded
        `,
        isActive && className`bg-v3-bg !text-v3-primary`,
      ]}
      {...(external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      <span className="flex items-center w-5">{icon}</span>
      <span className="ml-2 whitespace-nowrap">{title}</span>
    </a>
  );
};


const HeaderLinks = () => {
  return (
    <div className="flex-1 justify-center hidden md:!flex text-sm h-full">
      <HeaderLink href="/" isActive title={'Minting Lab'} icon={<SwapIcon width="20" height="20" />} />
      <HeaderLink href="/" isActive={false} title={'Liquidity'} icon={<LiquidityIcon width="20" height="20" />} />
      <HeaderLink
        href="https://github.com/TeamRaccoons/wallet-kit"
        isActive={false}
        external
        title={'Docs'}
        icon={<RepoLogo width="20" height="20" />}
      />
      <HeaderLink
        href="https://discord.gg/jup"
        isActive={false}
        external
        title={'Discord'}
        icon={<DiscordIcon width="20" height="20" />}
      />
    </div>
  );
};

export default HeaderLinks;
