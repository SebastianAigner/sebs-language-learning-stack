interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  
  return (
    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
      {steps.map(s => (
        <div 
          key={s} 
          style={{ 
            width: '30px', 
            height: '30px', 
            borderRadius: '50%', 
            backgroundColor: currentStep === s ? '#4a5568' : '#e2e8f0',
            color: currentStep === s ? 'white' : '#4a5568',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}
        >
          {s}
        </div>
      ))}
    </div>
  );
}
