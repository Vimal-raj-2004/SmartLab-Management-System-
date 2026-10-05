import React from 'react';

/**
 * FormField — labeled wrapper for inputs
 */
export default function FormField({
  label,
  required,
  children,
  error,
  className = '',
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  options = [],
  rows = 3,
  disabled = false,
  inputClassName = '',
  ...rest
}) {
  let content = children;

  if (!content) {
    if (type === 'select') {
      content = (
        <Select
          name={name}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={inputClassName}
          {...rest}
        >
          {placeholder && (
            <option value="" className="bg-slate-900 text-slate-400">
              {placeholder}
            </option>
          )}
          {options.map((opt, idx) => {
            const optVal = typeof opt === 'object' && opt !== null ? opt.value : opt;
            const optLabel = typeof opt === 'object' && opt !== null ? (opt.label ?? opt.value) : opt;
            return (
              <option key={optVal ?? idx} value={optVal} className="bg-slate-900 text-white">
                {optLabel}
              </option>
            );
          })}
        </Select>
      );
    } else if (type === 'textarea') {
      content = (
        <Textarea
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          required={required}
          className={inputClassName}
          {...rest}
        />
      );
    } else {
      content = (
        <Input
          type={type}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClassName}
          {...rest}
        />
      );
    }
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      {content}
      {error && <p className="text-xs text-rose-400 mt-0.5">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={`w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-y ${className}`}
    />
  );
}

export { FormField };
