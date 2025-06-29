import Image from 'next/image';
import KlikFinance from '@/public/klik-finance.png'

interface KlikFinanceIconProps {
    className?: string;
}

const KlikFinanceIcon = ({ className = '' }: KlikFinanceIconProps) => {
    return (
        <Image src={KlikFinance} alt="Klik Finance" width={30} height={30} />
    )
}

export default KlikFinanceIcon;