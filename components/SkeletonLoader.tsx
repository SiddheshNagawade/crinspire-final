import React from 'react';

interface Props {
  count?: number; 
  type?: 'card' | 'table' | 'text' | 'stat-card';
}

const SkeletonLoader: React.FC<Props> = ({ count = 4, type = 'card' }) => {
  if (type === 'stat-card') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
               </div>
               <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
               <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      )
  }

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-6 animate-pulse h-64">
            <div className="flex justify-between mb-4">
                <div className="h-4 bg-[#E5E7EB] rounded w-1/3"></div>
                <div className="h-8 w-8 bg-[#E5E7EB] rounded-full"></div>
            </div>
            <div className="h-6 bg-[#E5E7EB] rounded w-3/4 mb-4"></div>
            <div className="flex gap-4 mt-8">
                <div className="h-4 bg-[#E5E7EB] rounded w-1/4"></div>
                <div className="h-4 bg-[#E5E7EB] rounded w-1/4"></div>
            </div>
             <div className="h-px bg-[#E5E7EB] w-full my-4"></div>
             <div className="h-4 bg-[#E5E7EB] rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-4 w-full">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="h-16 bg-white border border-[#E5E7EB] rounded-lg animate-pulse w-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-4 bg-[#E5E7EB] rounded animate-pulse"></div>
      ))}
    </div>
  );
};

export default SkeletonLoader;