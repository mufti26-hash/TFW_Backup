import React from 'react';
import { RideWithCount } from '../types';
import { Role } from '../hooks/useAuth';

interface Props {
  ride: RideWithCount;
  onCountChange: (id: number, count: number) => void;
  onIncrement?: (id: number, delta: number) => void;
  role: Role;
  onChangePicture: () => void;
}

const RideCard: React.FC<Props> = ({ ride, onCountChange, onIncrement, role, onChangePicture }) => {
  const handleDec = () => {
    if (onIncrement) {
      onIncrement(ride.id, -1);
    } else {
      onCountChange(ride.id, Math.max(0, ride.count - 1));
    }
  };

  const handleInc = () => {
    if (onIncrement) {
      onIncrement(ride.id, 1);
    } else {
      onCountChange(ride.id, ride.count + 1);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full relative group transition-all">
      <div className="h-40 bg-gray-700 relative overflow-hidden">
        {ride.imageUrl ? (
            <img src={ride.imageUrl} alt={ride.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-700">No Image</div>
        )}
        {(role === 'admin' || role === 'operation-officer') && (
             <button 
                onClick={onChangePicture}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
             </button>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <h3 className="text-lg font-bold text-white">{ride.name}</h3>
            <span className="text-xs text-gray-300 bg-gray-600/50 px-2 py-0.5 rounded">{ride.floor}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col items-center justify-center flex-grow gap-4">
        <div className="text-4xl font-mono font-bold text-blue-400 select-none">{ride.count}</div>
        
        <div className="flex items-center gap-4 w-full max-w-[200px]">
            <button 
                onClick={handleDec}
                className="h-12 w-12 rounded-full bg-gray-700 hover:bg-red-900/50 active:scale-90 text-red-400 hover:text-red-200 flex items-center justify-center text-2xl font-bold transition-all select-none"
                aria-label="Decrease count"
            >
                -
            </button>
            <div className="flex-grow"></div>
            <button 
                onClick={handleInc}
                className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-90 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-900/50 transition-all select-none"
                aria-label="Increase count"
            >
                +
            </button>
        </div>
      </div>
    </div>
  );
};

export default RideCard;