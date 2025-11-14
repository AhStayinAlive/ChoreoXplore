import React from 'react';
import useStore from '../core/store';

const STEPS = [
  { id: 1, label: 'Choose Song', icon: '🎵' },
  { id: 2, label: 'Select Visuals', icon: '✨' },
  { id: 3, label: 'Start Motion', icon: '📹' },
  { id: 4, label: 'Select Hand Effects', icon: '✋' },
  { id: 5, label: 'Choose Hand Selection', icon: '👆' },
  { id: 6, label: 'Select Camera 2', icon: '📷' },
  { id: 7, label: 'Go to dance space and Dance!', icon: '💃' }
];

const SetupWizard = () => {
  const currentStep = useStore(s => s.setupStep || 1);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 50
    }}>
      <div style={{
        background: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid rgba(55, 65, 81, 1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        minWidth: '240px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#D1D5DB',
            margin: 0
          }}>Getting Started</h3>
          <span style={{
            fontSize: '12px',
            color: '#6B7280'
          }}>
            {currentStep}/7
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          height: '6px',
          background: '#1F2937',
          borderRadius: '9999px',
          marginBottom: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(to right, #3B82F6, #60A5FA)',
            width: `${(currentStep / 7) * 100}%`,
            transition: 'width 0.5s ease-out'
          }} />
        </div>

        {/* Steps List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isLocked = currentStep < step.id;

            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  borderRadius: '8px',
                  background: isCurrent ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                  opacity: isCompleted ? 0.6 : isLocked ? 0.3 : 1,
                  transition: 'all 0.3s'
                }}
              >
                {/* Icon/Checkbox */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                    background: isCompleted ? '#10B981' : isCurrent ? '#3B82F6' : '#374151',
                    color: isCompleted || isCurrent ? '#FFFFFF' : '#6B7280',
                    animation: isCurrent ? 'pulse 2s infinite' : 'none'
                  }}
                >
                  {isCompleted ? '✓' : step.icon}
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: isCurrent ? '#FFFFFF' : isCompleted ? '#34D399' : '#6B7280',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    transition: 'color 0.3s'
                  }}
                >
                  {step.label}
                </span>

                {/* Lock indicator */}
                {isLocked && (
                  <span style={{ marginLeft: 'auto', color: '#4B5563', fontSize: '12px' }}>🔒</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Step Hint */}
        {currentStep < 7 && (
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #1F2937'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#9CA3AF',
              lineHeight: '1.5',
              margin: 0
            }}>
              {currentStep === 1 && 'Search and play a song to begin'}
              {currentStep === 2 && 'Select a visual mode from the left panel'}
              {currentStep === 3 && 'Click "Start" to begin tracking'}
              {currentStep === 4 && 'Choose a hand effect from the left panel'}
              {currentStep === 5 && 'Select which hand(s) to use for effects'}
              {currentStep === 6 && 'Select Camera 2 from the dropdown'}
            </p>
          </div>
        )}

        {/* Success Message */}
        {currentStep === 7 && (
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(16, 185, 129, 0.5)',
            background: 'rgba(16, 185, 129, 0.1)',
            marginLeft: '-16px',
            marginRight: '-16px',
            marginBottom: '-16px',
            padding: '12px 16px',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px'
          }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#34D399',
              textAlign: 'center',
              margin: 0
            }}>
              🎉 All set! Start dancing!
            </p>
          </div>
        )}
      </div>
      
      {/* Add pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default SetupWizard;
