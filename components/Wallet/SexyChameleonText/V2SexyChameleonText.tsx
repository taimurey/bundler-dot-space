import { ReactNode } from 'react';
import tw, { css } from 'twin.macro';

const V2SexyChameleonText = ({ children, animate = true }: { children: ReactNode; animate?: boolean }) => {
  const style = css([
    tw`text-transparent bg-clip-text bg-gradient-to-r from-[rgba(199,242,132,1)] to-[rgba(0,190,240,1)] font-semibold font-mono`,
    animate ? tw`animate-hue` : tw``,
  ]);
  return (
    <span css={style}>
      {children}
    </span>
  );
};

export default V2SexyChameleonText;