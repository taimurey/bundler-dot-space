import 'twin.macro';
import React, { HTMLAttributes, PropsWithChildren, useEffect, useState } from 'react';
import tw from 'twin.macro';

const Collapse: React.FC<
  PropsWithChildren<{
    className?: HTMLAttributes<HTMLDivElement>['className'];
    height: string | number;
    maxHeight: string | number;
    expanded: boolean;
  }>
> = ({ children, className = '', height, maxHeight, expanded }) => {
  const [localHeight, setLocalHeight] = useState<string | number>(height);

  useEffect(() => {
    if (expanded) setLocalHeight(maxHeight);
    else setLocalHeight(height);
  }, [height, maxHeight, expanded]);

  const animationClass = expanded ? tw`animate-fade-in` : tw`animate-fade-out`;
  const styles = [
    tw`transition-all duration-200 overflow-hidden`,
    animationClass,
    { height: localHeight, maxHeight },
    className,
  ].join(' ');
  return (

    <div
      className={styles}
      style={{ height: localHeight, maxHeight }}
    >
      {children}
    </div>
  );
};

export default Collapse;
