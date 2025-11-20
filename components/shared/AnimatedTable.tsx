import React from 'react';
import { useTableRipple } from '../../utils/scrollAnimations';

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  colSpan?: number;
  rowSpan?: number;
}

export const AnimatedTableCell: React.FC<TableCellProps> = ({ 
  children, 
  className = '', 
  onClick,
  ...props 
}) => {
  const { createRipple } = useTableRipple();

  const handleClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
    createRipple(e);
    if (onClick) onClick();
  };

  return (
    <td 
      className={`relative ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </td>
  );
};

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AnimatedTableRow: React.FC<TableRowProps> = ({ 
  children, 
  className = '',
  onClick 
}) => {
  return (
    <tr 
      className={`transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

// HOC to wrap existing tables with animation
export const withTableAnimations = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    React.useEffect(() => {
      // Add animations to all table cells
      const tables = document.querySelectorAll('table tbody td');
      const { createRipple } = useTableRipple();
      
      const handleCellClick = (e: MouseEvent) => {
        const target = e.currentTarget as HTMLTableCellElement;
        createRipple(e as any);
      };

      tables.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
      });

      return () => {
        tables.forEach(cell => {
          cell.removeEventListener('click', handleCellClick);
        });
      };
    }, []);

    return <Component {...props} />;
  };
};
