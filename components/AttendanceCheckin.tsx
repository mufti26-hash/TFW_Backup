import React from 'react';
import { NotificationType } from '../imageStore';

interface Props {
  message: string;
  type: NotificationType;
  visible: boolean;
  onClose: () => void;
}

const NotificationComponent: React.FC<Props> = ({ message, type, visible, onClose }) => {
  if (!visible) return null;

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600'
  };

  return (
    <div className={`fixed bottom-4 right-4 ${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-fade-in-up`}>
      <span>{message}</span>
      <button onClick={onClose} className="text-white hover:text-gray-200 font-bold">&times;</button>
    </div>
  );
};

export default NotificationComponent;