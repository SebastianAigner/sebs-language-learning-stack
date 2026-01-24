
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

  it('shows samurai image for past-affirmative-polite', () => {
    const html = renderToString(
      <PolitenessImage 
        conjugationType="past-affirmative-polite" 
        isCasual={false} 
        isPolite={true} 
      />
    );
    
    // Should contain samurai image
    expect(html).toContain('samurai_kettou.png');
    // Should contain the clock emoji
    expect(html).toContain('🕰️');
    // Should contain affirmative indicator
    expect(html).toContain('✅');
  });

  it('shows album image for negative-past-casual', () => {
    const html = renderToString(
      <PolitenessImage 
        conjugationType="negative-past-casual" 
        isCasual={true} 
        isPolite={false} 
      />
    );
    
    // Should contain album image
    expect(html).toContain('album_roujin.png');
    // Should contain the clock emoji
    expect(html).toContain('🕰️');
    // Should contain negative indicator
    expect(html).toContain('❌');
  });

  it('shows progressive animation for progressive-polite', () => {
    const html = renderToString(
      <PolitenessImage 
        conjugationType="progressive-polite" 
        isCasual={false} 
        isPolite={true} 
      />
    );
    
    // Should contain progressive-animation class
    expect(html).toContain('progressive-animation');
    // Should contain office lady image
    expect(html).toContain('office_lady.png');
  });
});
