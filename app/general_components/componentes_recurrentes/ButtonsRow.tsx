import React, { FC } from 'react';

interface ButtonsRowProps {
  totalItems: number;        
  itemsPerPage?: number;     
  currentNumber: number;     
  onPageChange: (page: number) => void;  
}

const ButtonsRow: FC<ButtonsRowProps> = ({
  totalItems,
  itemsPerPage = 15,
  currentNumber,
  onPageChange
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getButtons = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentNumber <= 3) {
      return [1, 2, 3, '>', totalPages];
    } 

    if (currentNumber >= totalPages - 2) {
      return [1, '<', totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '<', currentNumber, '>', totalPages];
  };

  const buttons = getButtons();

  return (
    <div className="flex flex-row gap-3 cursor-pointer">
      {buttons.map((btn, idx) => {
        const isActive = btn === currentNumber;
        const isNav = btn === '>' || btn === '<';

        return (
          <button
            key={idx}
            className={`p-2 px-4 rounded-xl shadow text-sm font-bold text-white cursor-pointer
              ${isActive ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-900 hover:bg-blue-800'}
              ${isNav ? 'font-normal' : ''}`}
            onClick={() => {
              if (btn === '>') onPageChange(currentNumber + 1);
              else if (btn === '<') onPageChange(currentNumber - 1);
              else onPageChange(Number(btn));
            }}
          >
            {btn}
          </button>
        );
      })}
    </div>
  );
};

export default ButtonsRow;
