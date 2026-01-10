
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PolitenessImage } from './PolitenessImage';

describe('PolitenessImage', () => {
  it('does not show past indicators for non-past-affirmative-polite', () => {
    const html = renderToString(
      <PolitenessImage 
        conjugationType="non-past-affirmative-polite" 
        isCasual={false} 
        isPolite={true} 
      />
    );
    
    // Should NOT contain grayscale class
    expect(html).not.toContain('grayscale');
    // Should NOT contain the clock emoji
    expect(html).not.toContain('🕰️');
    // Should contain affirmative indicator
    expect(html).toContain('✅');
    // Should contain office lady image
    expect(html).toContain('office_lady.png');
  });

  it('shows past indicators for past-affirmative-polite', () => {
    const html = renderToString(
      <PolitenessImage 
        conjugationType="past-affirmative-polite" 
        isCasual={false} 
        isPolite={true} 
      />
    );
    
    // Should contain grayscale class
    expect(html).toContain('grayscale');
    // Should contain the clock emoji
    expect(html).toContain('🕰️');
    // Should contain affirmative indicator
    expect(html).toContain('✅');
  });

  it('shows past indicators for negative-past-casual', () => {
    const html = renderToString(
      <PolitenessImage 
        conjugationType="negative-past-casual" 
        isCasual={true} 
        isPolite={false} 
      />
    );
    
    // Should contain grayscale class
    expect(html).toContain('grayscale');
    // Should contain the clock emoji
    expect(html).toContain('🕰️');
    // Should contain negative indicator
    expect(html).toContain('❌');
    // Should contain nomikai image
    expect(html).toContain('nomikai_happy.png');
  });
});
