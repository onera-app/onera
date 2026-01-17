/**
 * SuggestedActions Component
 * Displays suggested prompts for empty chat state
 * Adapted from Vercel AI Chatbot
 */

import { memo } from 'react';
import { Suggestion } from './elements/suggestion';
import { cn } from '@/lib/utils';

type SuggestedActionsProps = {
  onSend: (content: string) => void;
  disabled?: boolean;
};

const suggestedActions = [
  'Explain quantum computing in simple terms',
  'Help me write a professional email',
  'What are the best practices for React?',
  'Debug this code for me',
];

function PureSuggestedActions({ onSend, disabled }: SuggestedActionsProps) {
  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <div
          key={suggestedAction}
          className={cn(
            'animate-in fade-in slide-in-from-bottom-4',
            index === 0 && 'animation-delay-[0ms]',
            index === 1 && 'animation-delay-[50ms]',
            index === 2 && 'animation-delay-[100ms]',
            index === 3 && 'animation-delay-[150ms]'
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left justify-start"
            onClick={(suggestion) => {
              onSend(suggestion);
            }}
            suggestion={suggestedAction}
            disabled={disabled}
          >
            {suggestedAction}
          </Suggestion>
        </div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions);
