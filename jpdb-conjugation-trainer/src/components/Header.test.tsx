
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Header } from './Header';

// Mock dependencies
vi.mock('../contexts/ConfigContext', () => ({
  useConfig: () => ({ config: { jpdbApiToken: 'test', ttsServiceUrl: 'test' } })
}));

const mockNavigate = vi.fn();
const mockLocation = { pathname: '/' };

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>
}));

describe('Header visibility logic', () => {
  it('shows both buttons on practice page', () => {
    mockLocation.pathname = '/practice';
    const html = renderToString(<Header isGrading={false} isGrammar={false} showCorrectAnimation={false} />);
    expect(html).toContain('Add New Cards');
    expect(html).toContain('Manage Grammar Cards');
  });

  it('shows only Manage Grammar Cards on wizard page', () => {
    mockLocation.pathname = '/wizard';
    const html = renderToString(<Header isGrading={false} isGrammar={false} showCorrectAnimation={false} />);
    expect(html).not.toContain('Add New Cards');
    expect(html).toContain('Manage Grammar Cards');
  });

  it('shows only Add New Cards on grammar page', () => {
    mockLocation.pathname = '/grammar';
    const html = renderToString(<Header isGrading={false} isGrammar={true} showCorrectAnimation={false} />);
    expect(html).toContain('Add New Cards');
    expect(html).not.toContain('Manage Grammar Cards');
  });
});
