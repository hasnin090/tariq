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
    <div className="flex flex-col items-center justify-center text-center h-80 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 p-8 animate-fade-in">
      <div className="w-20 h-20 p-4 bg-slate-100/50 dark:bg-slate-700/50 rounded-full text-slate-400 dark:text-slate-500 mb-4">
        <Icon />
      </div>
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>
      {actionButton && (
        <button
          onClick={actionButton.onClick}
          className="mt-6 bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-md hover:shadow-primary-500/20 transition-all duration-200"
        >
          {actionButton.text}
        </button>
      )}
    </div>
  );
};

export default EmptyState;