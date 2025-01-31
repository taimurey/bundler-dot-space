import React from 'react';
import DiscordIcon from '@/components/icons/DiscordIcon';
import RepoLogo from '@/components/icons/RepoLogo';
import SwapIcon from '@/components/icons/SwapIcon';


const HeaderLink: React.FC<{
  external?: boolean;
  href: string;
  icon: React.ReactNode;
  label: string | React.ReactNode;
}> = ({ external, href, icon, label }) => {
  return (
    <a
      href={href}
      className="bg-white/10 flex items-center px-5 py-4 rounded-xl"
      {...(external
        ? {
          target: '_blank',
          rel: 'noopener noreferrer',
        }
        : {})}
    >
      <span className="flex items-center justify-center h-9 w-9 rounded-full text-white/50 fill-current bg-black/25">
        {icon}
      </span>
      <p className="ml-5 font-medium">{label}</p>
    </a>
  );
};

const HeaderLinksMobile: React.FC = () => {

  return (
    <div className="px-5 py-4 text-base text-white space-y-2">
      <HeaderLink href="/" label={'Demo'} icon={<SwapIcon width="20" height="20" />} />
      <HeaderLink
        href="/"
        external
        label={'Repo'}
        icon={<RepoLogo width="20" height="20" />}
      />
      <HeaderLink
        href="https://discord.gg/HGFf7NNHrp"
        external
        label={'Discord'}
        icon={<DiscordIcon width="20" height="20" />}
      />
    </div>
  );
};

export default HeaderLinksMobile;
