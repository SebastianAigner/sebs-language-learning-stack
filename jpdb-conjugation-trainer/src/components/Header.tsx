import { memo } from 'react';
import type { ReactNode } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { TTSStatusIndicator } from './TTSStatusIndicator';
import { JPDBStatusIndicator } from './JPDBStatusIndicator';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Button } from './ui/Button';

interface HeaderProps {
  showCorrectAnimation: boolean;
  isGrading?: boolean;
  isGrammar?: boolean;
}

interface HeaderButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'icon' | 'ghost' | 'outline';
}

const HeaderButton = ({ onClick, children, variant = 'secondary' }: HeaderButtonProps) => (
  <Button 
    variant={variant} 
    onClick={onClick}
    style={{ padding: '4px 12px', fontSize: '13px' }}
  >
    {children}
  </Button>
);

export const Header = memo(function Header({ showCorrectAnimation, isGrading, isGrammar }: HeaderProps) {
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const isWizard = location.pathname === '/wizard';

  const handleTitleClick = () => {
    void navigate({ to: '/practice' });
  };

  return (
    <header className={showCorrectAnimation ? 'header-correct' : ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 
            onClick={handleTitleClick} 
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <ruby>動詞<rt>どうし</rt></ruby><ruby>推<rt>お</rt></ruby>し
          </h1>
          <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
            {!isWizard && (
              <HeaderButton onClick={() => void navigate({ to: '/wizard' })}>
                Add New Cards
              </HeaderButton>
            )}
            {!isGrammar && (
              <HeaderButton onClick={() => void navigate({ to: '/grammar' })}>
                Manage Grammar Cards
              </HeaderButton>
            )}
          </div>
        </div>
        {isGrading && (
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <img 
              src="/img/thinking_face_animated.png" 
              alt="Thinking..." 
              style={{ width: '32px', height: '32px' }} 
            />
          </div>
        )}
        {showCorrectAnimation && (
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '32px'
          }}>
            ✓
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <TTSStatusIndicator ttsServiceUrl={config.ttsServiceUrl} />
          <JPDBStatusIndicator jpdbServiceUrl={config.apiBaseUrl} />
        </div>
      </div>
    </header>
  );
});
