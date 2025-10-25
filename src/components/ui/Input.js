import React from 'react';

const Input = ({ 
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  label,
  error,
  required = false,
  disabled = false,
  ...props 
}) => {
  const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const classes = [
    'input',
    error ? 'input--error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={classes}
        required={required}
        disabled={disabled}
        {...props}
      />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
};

export default Input;
