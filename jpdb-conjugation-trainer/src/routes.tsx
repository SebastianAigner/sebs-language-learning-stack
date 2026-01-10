import { createRootRoute, createRoute, createRouter, Outlet, useNavigate } from '@tanstack/react-router';
import { LoadingView } from './components/LoadingView';
import { PromptView } from './components/PromptView';
import { GradingView } from './components/GradingView';
import { ResultView } from './components/ResultView';
import { CompletionView } from './components/CompletionView';
import { GrammarCardManager } from './components/GrammarCardManager';
import { Wizard } from './components/Wizard';
import { Header } from './components/Header';
import { QueuePreview } from './components/QueuePreview';
import { QueuePanel } from './components/QueuePanel';
import { useLocation } from '@tanstack/react-router';
import { useSession } from './contexts/SessionContext';
import { useUI } from './contexts/UIContext';
import { useConfig } from './contexts/ConfigContext';
import { useGrading } from './hooks/useGrading';
import { useResultActions } from './hooks/useResultActions';
import { useFetchVocabulary, usePracticeEvergreens } from './hooks/useFetchVocabulary';
import { loadSession } from './persistence';
import type { GradingResult } from './types';
import { useEffect, useState, useCallback } from 'react';

// Root component that acts as the layout
function Root() {
  const location = useLocation();
  
  // Logic from AppContent moved here
  // We need to determine if we are in 'result' or 'grading' based on the path
  const isResult = location.pathname === '/result';
  const isGrading = location.pathname === '/grading';
  const isGrammar = location.pathname === '/grammar';
  
  // For result styles, we need the gradingResult. 
  // TanStack Router allows accessing state from location.
  const state = location.state as { result?: GradingResult } | undefined;
  const gradingResult = state?.result;
  
  const isCorrect = isResult && gradingResult?.isCorrect;
  const isIncorrect = isResult && !gradingResult?.isCorrect;

  const showCorrectAnimation = !!isCorrect;
  const showIncorrectBorder = !!isIncorrect;

  return (
    <div id="app" className={`${showCorrectAnimation ? 'correct-outline' : ''} ${showIncorrectBorder ? 'incorrect-outline' : ''}`}>
      <Header showCorrectAnimation={showCorrectAnimation} isGrading={isGrading} isGrammar={isGrammar} />

      <main>
        <Outlet />
      </main>

      {!isGrammar && (
        <>
          <QueuePreview />
          <QueuePanel />
        </>
      )}

      <div style={{
        position: 'fixed',
        bottom: '5px',
        right: '10px',
        fontSize: '10px',
        color: '#999',
        fontFamily: 'monospace',
        userSelect: 'none',
        pointerEvents: 'none'
      }}>
        v1.1.0 (Router)
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: Root,
});

const LoadingContainer = () => {
  const { fetchVocabulary } = useFetchVocabulary();
  const { practiceEvergreens } = usePracticeEvergreens();
  const { isComplete } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    const savedSession = loadSession();
    const hasActiveSession = savedSession &&
      savedSession.queue.length > 0 &&
      savedSession.currentIndex < savedSession.queue.length;

    if (hasActiveSession) {
      void navigate({ to: '/practice', replace: true });
    } else {
      void navigate({ to: '/wizard', replace: true });
    }
  }, [navigate]);

  return (
    <LoadingView
      hasItems={!isComplete}
      onFetchVocabulary={() => void fetchVocabulary()}
      onPracticeEvergreens={() => void practiceEvergreens()}
    />
  );
};

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LoadingContainer,
});

const wizardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wizard',
  component: Wizard,
});

const PromptContainer = () => {
  const { currentItem, session, isComplete } = useSession();
  const { ui } = useUI();
  const { handleGrade } = useGrading();
  const navigate = useNavigate();

  useEffect(() => {
    if (isComplete) {
      void navigate({ to: '/completion', replace: true });
    }
  }, [isComplete, navigate]);

  if (isComplete || !currentItem) {
    return null;
  }

  return (
    <PromptView
      currentItem={currentItem}
      currentIndex={session.currentIndex}
      tutorialMode={ui.tutorialMode}
      onGrade={handleGrade}
      currentStreak={session.stats.currentStreak}
    />
  );
};

const promptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/practice',
  component: PromptContainer,
});

const gradingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/grading',
  component: GradingView,
});

const ResultContainer = () => {
  const location = useLocation();
  const { currentItem } = useSession();
  const { config } = useConfig();
  const navigate = useNavigate();
  const state = location.state as { result?: GradingResult } | undefined;
  const gradingResult = state?.result;

  const [wasOverriddenAsCorrect, setWasOverriddenAsCorrect] = useState(false);

  const handleOverrideAsCorrect = useCallback(() => {
    setWasOverriddenAsCorrect(true);
  }, []);

  const actions = useResultActions({
    wasOverriddenAsCorrect,
    onOverrideAsCorrect: handleOverrideAsCorrect,
    gradingResult
  });

  useEffect(() => {
    if (!gradingResult) {
      void navigate({ to: '/practice', replace: true });
    }
  }, [gradingResult, navigate]);

  if (!gradingResult) {
    return null;
  }

  const isCurrentItem = gradingResult ? currentItem?.id === gradingResult.itemId : false;

  return (
    <ResultView
      gradingResult={gradingResult}
      config={config}
      actions={actions}
      wasOverriddenAsCorrect={wasOverriddenAsCorrect}
      onOverrideAsCorrect={() => setWasOverriddenAsCorrect(true)}
      isCurrentItem={isCurrentItem}
    />
  );
};

const resultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/result',
  component: ResultContainer,
});

const CompletionContainer = () => {
  const { session, clearSession } = useSession();
  const navigate = useNavigate();

  return (
    <CompletionView
      session={session}
      onStartNewSession={() => {
        clearSession();
        void navigate({ to: '/wizard' });
      }}
    />
  );
};

const completionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/completion',
  component: CompletionContainer,
});

const CatchAllContainer = () => {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: '/', replace: true });
  }, [navigate]);
  return null;
};

// Catch-all route to redirect to index
const catchAllRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '*',
    component: CatchAllContainer,
})

const GrammarContainer = () => {
  const navigate = useNavigate();
  return <GrammarCardManager onBack={() => void navigate({ to: '/', replace: true })} />;
};

const grammarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/grammar',
  component: GrammarContainer,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  wizardRoute,
  promptRoute,
  gradingRoute,
  resultRoute,
  completionRoute,
  grammarRoute,
  catchAllRoute
]);

export const router = createRouter({ 
    routeTree,
    defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface HistoryState {
    result?: GradingResult;
  }
}
