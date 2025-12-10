import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  message?: string;
  subtext?: string;
}

const LoadingScreen: React.FC<Props> = ({
  message = "Loading...",
  subtext = "Please wait..."
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full mx-4">
        <div className="flex justify-center mb-6">
          <Loader2 size={48} className="text-[#1F2937] animate-spin" />
        </div>
        <h3 className="text-[#1F2937] font-bold text-xl mb-2">{message}</h3>
        <p className="text-[#6B7280] text-sm">{subtext}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;