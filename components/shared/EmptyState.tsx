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
    <div className="flex flex-col items-center justify-center text-center h-80 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8">
      <div className="w-16 h-16 text-slate-400 dark:text-slate-500">
        <Icon />
      </div>
      <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>
      {actionButton && (
        <button
          onClick={actionButton.onClick}
          className="mt-6 bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm"
        >
          {actionButton.text}
        </button>
      )}
    </div>
  );
};

export default EmptyState;