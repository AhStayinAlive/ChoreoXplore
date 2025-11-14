import React from 'react';
import useStore from '../core/store';

const STEPS = [
  { id: 1, label: 'Type a Song', location: 'Bottom Middle Panel', icon: '🎵' },
  { id: 2, label: 'Select Visuals', location: 'Top Left Panel', icon: '✨' },
  { id: 3, label: 'Start Motion', location: 'Top Right Panel', icon: '📹' },
  { id: 4, label: 'Select Hand Effects', location: 'Bottom Left Panel', icon: '✋' },
  { id: 5, label: 'Choose Hand', location: 'Bottom Left Panel', icon: '👆' },
  { id: 6, label: 'Select Camera 2', location: 'Top Right Panel', icon: '📷' },
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
        borderRadius: '12px',
        padding: '12px',
        border: '1px solid rgba(55, 65, 81, 1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        minWidth: '240px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#D1D5DB',
            margin: 0
          }}>Getting Started</h3>
          <span style={{
            fontSize: '11px',
            color: '#6B7280'
          }}>
            {currentStep}/7
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          height: '4px',
          background: '#1F2937',
          borderRadius: '9999px',
          marginBottom: '10px',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                  gap: '8px',
                  padding: '6px',
                  borderRadius: '6px',
                  background: isCurrent ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                  opacity: isCompleted ? 0.6 : isLocked ? 0.3 : 1,
                  transition: 'all 0.3s'
                }}
              >
                {/* Icon/Checkbox */}
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: isCurrent ? '#FFFFFF' : isCompleted ? '#34D399' : '#6B7280',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      transition: 'color 0.3s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {step.label}
                  </div>
                  {step.location && (
                    <div
                      style={{
                        fontSize: '9px',
                        color: isCurrent ? 'rgba(255, 255, 255, 0.7)' : 'rgba(107, 114, 128, 0.8)',
                        marginTop: '1px',
                        fontStyle: 'italic'
                      }}
                    >
                      ({step.location})
                    </div>
                  )}
                </div>

                {/* Lock indicator */}
                {isLocked && (
                  <span style={{ marginLeft: 'auto', color: '#4B5563', fontSize: '11px', flexShrink: 0 }}>🔒</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Step Hint */}
        {currentStep < 7 && (
          <div style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid #1F2937'
          }}>
            <p style={{
              fontSize: '11px',
              color: '#9CA3AF',
              lineHeight: '1.4',
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
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(16, 185, 129, 0.5)',
            background: 'rgba(16, 185, 129, 0.1)',
            marginLeft: '-12px',
            marginRight: '-12px',
            marginBottom: '-12px',
            padding: '8px 12px',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px'
          }}>
            <p style={{
              fontSize: '12px',
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
      
      {/* Add pulse animation and wizard highlighting */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        @keyframes wizardHighlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(255, 107, 0, 0.8), 0 0 25px rgba(255, 107, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(255, 107, 0, 1), 0 0 35px rgba(255, 107, 0, 0.8);
          }
        }
        
        [data-wizard-step="${currentStep}"] {
          animation: wizardHighlight 2s ease-in-out infinite !important;
          position: relative;
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
};

export default SetupWizard;
