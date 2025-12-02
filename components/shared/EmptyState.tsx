import React from 'react';

interface EmptyStateProps {
  Icon: React.ElementType;
  title: string;
  message: string;
  actionButton?: {
    text: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ Icon, title, message, actionButton }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[400px] glass-card border-2 border-dashed border-white/20 p-12 animate-fade-in">
      <div className="w-24 h-24 p-5 bg-white/10 rounded-full flex items-center justify-center text-slate-300 mb-6 backdrop-blur-sm">
        <Icon className="w-full h-full" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-base text-slate-300 max-w-md mb-8 leading-relaxed">{message}</p>
      {actionButton && (
        <button
          onClick={actionButton.onClick}
          className="btn-primary"
        >
          {actionButton.text}
        </button>
      )}
    </div>
  );
};

export default EmptyState;