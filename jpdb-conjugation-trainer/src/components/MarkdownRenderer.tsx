import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderLine = (line: string, index: number) => {
    // Empty line - add spacing
    if (line.trim() === '') {
      return <div key={index} style={{ height: '12px' }} />;
    }

    // Check if line starts with bullet point
    if (line.trim().startsWith('•')) {
      const bulletContent = line.replace(/^•\s*/, '');
      const parts = parseInlineFormatting(bulletContent);

      return (
        <div key={index} style={{ display: 'flex', gap: '8px', marginLeft: '10px', marginBottom: '8px', marginTop: '8px' }}>
          <span style={{ color: '#f39c12', fontWeight: 'bold', flexShrink: 0 }}>•</span>
          <span>{parts}</span>
        </div>
      );
    }

    // Check if line is an indented dash bullet (nested list item)
    const indentedBulletMatch = line.match(/^(\s+)-\s+(.*)$/);
    if (indentedBulletMatch) {
      const bulletContent = indentedBulletMatch[2];
      const parts = parseInlineFormatting(bulletContent);

      return (
        <div key={index} style={{ display: 'flex', gap: '8px', marginLeft: '40px', marginBottom: '6px', marginTop: '6px' }}>
          <span style={{ color: '#f39c12', fontWeight: 'bold', flexShrink: 0 }}>•</span>
          <span>{parts}</span>
        </div>
      );
    }

    // Check for markdown headings
    const headingMatch = line.trim().match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2];
      const parts = parseInlineFormatting(headingContent);

      const headingStyles: Record<number, React.CSSProperties> = {
        1: { fontSize: '22px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px', color: '#1a202c', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' },
        2: { fontSize: '19px', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px', color: '#2d3748' },
        3: { fontSize: '17px', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px', color: '#2d3748' },
        4: { fontSize: '16px', fontWeight: 'bold', marginTop: '14px', marginBottom: '6px', color: '#4a5568' },
        5: { fontSize: '15px', fontWeight: 'bold', marginTop: '12px', marginBottom: '4px', color: '#4a5568' },
        6: { fontSize: '14px', fontWeight: 'bold', marginTop: '10px', marginBottom: '2px', color: '#718096' },
      };

      return (
        <div key={index} style={headingStyles[level] || headingStyles[6]}>
          {parts}
        </div>
      );
    }

    // Regular line with potential bold formatting
    const parts = parseInlineFormatting(line);

    // Check if it's a heading (starts with **)
    if (line.trim().startsWith('**')) {
      return (
        <div key={index} style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '16px', marginBottom: '10px', color: '#2d3748' }}>
          {parts}
        </div>
      );
    }

    return <div key={index} style={{ marginBottom: '8px' }}>{parts}</div>;
  };

  const parseInlineFormatting = (text: string): (string | React.ReactElement)[] => {
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add bold text
      parts.push(
        <strong key={`bold-${match.index}`} style={{ fontWeight: 700 }}>
          {match[1]}
        </strong>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const lines = content.split('\n');

  // Group consecutive numbered list items
  const renderElements = () => {
    const elements: React.ReactElement[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const numberedListMatch = line.match(/^(\d+)\.\s+(.*)$/);

      if (numberedListMatch) {
        // Start of a numbered list - collect all consecutive numbered items
        const listItems: React.ReactElement[] = [];
        let j = i;

        while (j < lines.length) {
          const currentLine = lines[j];
          const currentMatch = currentLine.match(/^(\d+)\.\s+(.*)$/);

          if (!currentMatch) break;

          const content = currentMatch[2];
          const parts = parseInlineFormatting(content);

          listItems.push(
            <li key={j} style={{ marginBottom: '6px' }}>
              {parts}
            </li>
          );

          j++;
        }

        elements.push(
          <ol key={`ol-${i}`} style={{
            marginLeft: '20px',
            marginTop: '8px',
            marginBottom: '8px',
            paddingLeft: '8px'
          }}>
            {listItems}
          </ol>
        );

        i = j;
      } else {
        elements.push(renderLine(line, i));
        i++;
      }
    }

    return elements;
  };

  return (
    <div style={{ lineHeight: 1.8 }}>
      {renderElements()}
    </div>
  );
}
