import type { ConjugationType } from '../../types';

interface PolitenessImageProps {
  conjugationType?: ConjugationType;
  isCasual: boolean;
  isPolite: boolean;
}

export function PolitenessImage({ conjugationType, isCasual, isPolite }: PolitenessImageProps) {
  if (conjugationType === undefined || (!isCasual && !isPolite)) {
    return null;
  }

  const isPast = conjugationType.includes('past') && !conjugationType.includes('non-past');
  const isNegative = conjugationType.includes('negative');
  const isAffirmative = !isNegative && !conjugationType.includes('te-form');
  const isProgressive = conjugationType.includes('progressive');

  let src = isCasual ? '/img/nomikai_happy.png' : '/img/office_lady.png';
  if (isPast) {
    src = isCasual ? '/img/album_roujin.png' : '/img/samurai_kettou.png';
  }
  const alt = isCasual ? 'Casual' : 'Polite';

  return (
    <div className="politeness-container" style={{ marginBottom: '15px' }}>
      <img
        src={src}
        alt={alt}
        className={`politeness-image ${isProgressive ? 'progressive-animation' : ''}`}
      />
      {isNegative ? <div className="overlay-tr" title="Negative">
          ❌
        </div> : null}
      {isAffirmative ? <div className="overlay-tr" title="Affirmative">
          ✅
        </div> : null}
      {(isPast || isProgressive) ? <div className="overlay-br">
          {isPast ? <span title="Past">🕰️</span> : null}
          {isProgressive ? <span title="Progressive">⏩</span> : null}
        </div> : null}
    </div>
  );
}
