import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  onClick,
  hoverable = false,
  ...props 
}) => {
  const baseClasses = 'card';
  const hoverableClass = hoverable ? 'card--hoverable' : '';
  
  const classes = [
    baseClasses,
    hoverableClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
