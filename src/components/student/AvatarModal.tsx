import React from 'react';
import { avatars } from '../../assets/avatars';
import { X } from 'lucide-react';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarUrl: string) => void;
  currentAvatar: string;
}

const AvatarModal: React.FC<AvatarModalProps> = ({ isOpen, onClose, onSelect, currentAvatar }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-transform duration-300 ease-in-out scale-95 hover:scale-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Avatar</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors rounded-full p-1"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {avatars.map(avatar => (
            <div key={avatar.id} className="relative">
              <button 
                onClick={() => onSelect(avatar.url)}
                className={`w-full aspect-square rounded-full overflow-hidden border-4 transition-all duration-200 ease-in-out \
                  ${currentAvatar === avatar.url 
                    ? 'border-blue-600 ring-2 ring-blue-300' 
                    : 'border-gray-200 hover:border-blue-500'}`}
              >
                <img 
                  src={avatar.url} 
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          ))}
        </div>
        
        <p className="text-center text-gray-500 mt-6 text-sm">
          Select an avatar to represent you on the leaderboard.
        </p>
      </div>
    </div>
  );
};

export default AvatarModal;
