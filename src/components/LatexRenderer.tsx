import React, { useMemo } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ text, className = '', inline = false }) => {
  const html = useMemo(() => {
    if (!text) return '';

    try {
      // Split by display math $$...$$ and inline math $...$
      // We look for $$...$$ or $...$
      const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);

      return parts
        .map((part) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            const math = part.slice(2, -2).trim();
            try {
              return katex.renderToString(math, { displayMode: true, throwOnError: false });
            } catch {
              return part;
            }
          } else if (part.startsWith('$') && part.endsWith('$')) {
            const math = part.slice(1, -1).trim();
            try {
              return katex.renderToString(math, { displayMode: false, throwOnError: false });
            } catch {
              return part;
            }
          }
          // Escape HTML characters in plain text to avoid XSS
          return part
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br/>');
        })
        .join('');
    } catch (e) {
      return text;
    }
  }, [text]);

  const Tag = inline ? 'span' : 'div';

  return (
    <Tag
      className={`latex-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default LatexRenderer;
