
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('should not throw error when rendered with children', () => {
    // This test is expected to fail or at least show warning if the issue is present
    const html = renderToString(
      <Checkbox label="Test Label">
        <span>Extra Child</span>
      </Checkbox>
    );
    expect(html).toContain('Test Label');
    expect(html).toContain('Extra Child');
    expect(html).toContain('type="checkbox"');
  });
});
