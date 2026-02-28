import React from 'react';

/**
 * Renders text with **bold** markdown syntax as <strong> elements.
 * Only supports bold (**text**), not full markdown.
 */
export function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;
  
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
  );
}
