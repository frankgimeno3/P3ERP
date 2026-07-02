import React, { FC, useState, ChangeEvent, useEffect } from 'react';
import countries from './countries.json';

interface Country {
    code: string;
    name: string;
    prefix: string;
}

interface SelectCountryPrefixProps {
    value: string;
    startingValue: string;
    onChange: (value: string) => void;
    showSelect: boolean;
    setShowSelect: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SelectCountryPrefix: FC<SelectCountryPrefixProps> = ({
    value,
    startingValue,
    onChange,
    showSelect,
    setShowSelect
}) => {
    const [inputValue, setInputValue] = useState(startingValue.replace('+', ''));
    const [isModified, setIsModified] = useState(false);

    // Sincroniza inputValue con value solo si el usuario aún no lo modificó
    useEffect(() => {
        if (!isModified) {
            setInputValue(startingValue.replace('+', ''));
        } else {
            setInputValue(value.replace('+', ''));
        }
    }, [value, startingValue, isModified]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        setInputValue(val);
        setIsModified(true);
        onChange(`+${val}`);
    };

    const handleSelectChange = (prefix: string) => {
        setInputValue(prefix);
        setIsModified(true);
        onChange(`+${prefix}`);
        setShowSelect(false);
    };

    const filteredCountries = countries.filter(
        (c) =>
            c.name.toLowerCase().includes(inputValue.toLowerCase()) ||
            c.prefix.startsWith(inputValue)
    );

    const selectedCountry = countries.find(c => c.prefix === inputValue);

    return (
        <div className="relative">
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-2 py-1 bg-white w-36">
                {selectedCountry && !showSelect && (
                    <div className="text-xs pr-2 text-gray-600">{selectedCountry.code}</div>
                )}
                <span className="text-lg mr-1">+</span>
                <input
                    type="tel"
                    placeholder="Prefijo"
                    className="w-12 outline-none"
                    value={inputValue}
                    onChange={handleInputChange}
                />
                <button
                    type="button"
                    onClick={() => setShowSelect(prev => !prev)}
                    className={`flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 cursor-pointer text-xs ${showSelect ? 'rotate-180' : 'rotate-0'}`}
                >
                    <svg
                        width="8"
                        height="8"
                        viewBox="0 0 200 200"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <polygon
                            points="20,50 100,150 180,50"
                            fill="none"
                            stroke="gray"
                            strokeWidth="10"
                        />
                    </svg>
                </button>
            </div>

            {showSelect && (
                <div className="absolute top-full left-0 mt-1 w-96 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                    {filteredCountries.map(c => (
                        <div
                            key={c.code}
                            className="flex justify-between p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleSelectChange(c.prefix)}
                        >
                            <span>{c.name}</span>
                            <span>+{c.prefix}</span>
                        </div>
                    ))}
                    {filteredCountries.length === 0 && (
                        <div className="p-2 text-gray-400">No se encontró ningún país</div>
                    )}
                </div>
            )}
        </div>
    );
};
