import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { useTableRipple } from '../../utils/scrollAnimations';
import gsap from 'gsap';

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

// ============================================
// 🎬 GSAP Animated Table Component
// ============================================

interface GsapTableProps {
  children: React.ReactNode;
  className?: string;
}

export const GsapTable: React.FC<GsapTableProps> = ({ children, className = '' }) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const hasAnimated = useRef(false);

  useLayoutEffect(() => {
    if (tableRef.current && !hasAnimated.current) {
      hasAnimated.current = true;
      const rows = tableRef.current.querySelectorAll('tbody tr');
      
      gsap.fromTo(rows,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
          delay: 0.1
        }
      );
    }
  }, []);

  return (
    <table ref={tableRef} className={className}>
      {children}
    </table>
  );
};

interface GsapTableBodyProps {
  children: React.ReactNode;
  className?: string;
  deps?: any[]; // Dependencies to trigger re-animation
}

export const GsapTableBody: React.FC<GsapTableBodyProps> = ({ children, className = '', deps = [] }) => {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const hasAnimated = useRef(false);

  useLayoutEffect(() => {
    if (tbodyRef.current && !hasAnimated.current) {
      hasAnimated.current = true;
      const rows = tbodyRef.current.querySelectorAll('tr');
      
      // Animate rows
      gsap.fromTo(rows,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.04,
          ease: "power2.out",
          delay: 0.05
        }
      );
    }
  }, deps);

  return (
    <tbody ref={tbodyRef} className={className}>
      {children}
    </tbody>
  );
};

// Hook for animating table on data change
export const useTableAnimation = (deps: any[] = []) => {
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (tableRef.current) {
      const rows = tableRef.current.querySelectorAll('tbody tr');
      
      gsap.fromTo(rows,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.3,
          stagger: 0.03,
          ease: "power2.out"
        }
      );
    }
  }, deps);

  return tableRef;
};

// Hook for row hover animation
export const useRowHoverAnimation = () => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLTableRowElement>) => {
    gsap.to(e.currentTarget, {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      x: -5,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLTableRowElement>) => {
    gsap.to(e.currentTarget, {
      backgroundColor: 'transparent',
      x: 0,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  return { handleMouseEnter, handleMouseLeave };
};

