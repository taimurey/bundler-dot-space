
interface Propss {
    id: string;
    label: string;
    value: string;
    latedisplay: boolean;
}
export const OutputField: React.FC<Propss> = ({ id, label, value, latedisplay }) => {
    return (
        <div className='w-full '>
            {label &&
                <label className="block mt-5 text-base text-white font-semibold" htmlFor={id}>
                    {label}
                </label>
            }
            <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end max-w-[300px] ">
                {!latedisplay || value.length > 0 ? <p
                    id={id}

                    className="block w-full py-2 rounded-md text-base   text-[#96989c] bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px] truncate"
                >
                    {value}
                </p> : <p></p>

                }
            </div>
        </div>
    );
};