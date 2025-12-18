import React from 'react';

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

const CrinspireLogo: React.FC<Props> = ({ className, style }) => {
  return (
    <img src="/logo.svg" alt="Crinspire" className={className} style={style} />
  );
};

export default CrinspireLogo;