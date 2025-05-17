import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Card({ children, className = "", title, titleAction, footer }: CardProps) {
  return (
    <div className={`bg-surface rounded-card shadow-card overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium leading-6 text-text-primary font-heading">{title}</h3>
          {titleAction && <div>{titleAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
}
