"use client";

import { useEffect, useState } from "react";

interface FormattedDateProps {
  date: string;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
  showTime?: boolean;
  locale?: string;
}

export default function FormattedDate({ date, options, className = "", showTime = false, locale }: FormattedDateProps) {
  const [formattedDate, setFormattedDate] = useState<string>("");

  useEffect(() => {
    if (!date) return;

    const dateObj = new Date(date);
    
    // Default options if none provided
    const defaultOptions: Intl.DateTimeFormatOptions = showTime 
      ? { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          second: undefined 
        }
      : { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        };

    const finalOptions = options || defaultOptions;
    
    // Use the provided locale or browser's default locale, and the browser's timezone
    setFormattedDate(dateObj.toLocaleString(locale || undefined, finalOptions));
  }, [date, options, showTime, locale]);

  // Render a placeholder or nothing to avoid hydration mismatch
  if (!formattedDate) {
    return <span className={`opacity-0 ${className}`}>...</span>;
  }

  return <span className={className}>{formattedDate}</span>;
}
