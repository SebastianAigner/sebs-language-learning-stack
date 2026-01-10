import { Button } from './ui/Button';

interface LoadingViewProps {
  hasItems: boolean;
  onFetchVocabulary: () => void;
  onPracticeEvergreens: () => void;
}

export function LoadingView({ hasItems, onFetchVocabulary, onPracticeEvergreens }: LoadingViewProps) {
  return (
    <div className="view" style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '20px', fontSize: '18px', color: '#718096' }}>
        {hasItems ? 'Loading reviews...' : 'No vocabulary loaded'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
        <Button
          variant="primary"
          onClick={onFetchVocabulary}
          style={{ padding: '15px 40px', fontSize: '16px', fontWeight: 'bold', minWidth: '280px' }}
        >
          Fetch Vocabulary
        </Button>
        <Button
          variant="secondary"
          onClick={onPracticeEvergreens}
          style={{ padding: '15px 40px', fontSize: '16px', fontWeight: 'bold', minWidth: '280px' }}
        >
          Practice the Evergreens
        </Button>
      </div>
    </div>
  );
}
