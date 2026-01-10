import type { ConjugationType } from '../../types';

interface PolitenessImageProps {
  conjugationType?: ConjugationType;
  isCasual: boolean;
  isPolite: boolean;
}

export function PolitenessImage({ conjugationType, isCasual, isPolite }: PolitenessImageProps) {
  if (!conjugationType || (!isCasual && !isPolite)) {
    return null;
  }

  const isPast = conjugationType.includes('past') && !conjugationType.includes('non-past');
  const isNegative = conjugationType.includes('negative');
  const isAffirmative = !isNegative && !conjugationType.includes('te-form');
  const isProgressive = conjugationType.includes('progressive');

  const src = isCasual ? '/img/nomikai_happy.png' : '/img/office_lady.png';
  const alt = isCasual ? 'Casual' : 'Polite';

  return (
    <div className="politeness-container" style={{ marginBottom: '15px' }}>
      <img
        src={src}
        alt={alt}
        className={`politeness-image ${isPast ? 'grayscale' : ''}`}
      />
      {isNegative && (
        <div className="overlay-tr" title="Negative">
          ❌
        </div>
      )}
      {isAffirmative && (
        <div className="overlay-tr" title="Affirmative">
          ✅
        </div>
      )}
      {(isPast || isProgressive) && (
        <div className="overlay-br">
          {isPast && <span title="Past">🕰️</span>}
          {isProgressive && <span title="Progressive">⏩</span>}
        </div>
      )}
    </div>
  );
}
