import Image from 'next/image';
import React from 'react';
import capsule from '../../public/capsule.png'

const Capsule: React.FC = () => {
    return (
        <Image src={capsule} alt="capsule" width={25} height={25} />
    );
};

export default Capsule;