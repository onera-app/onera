/**
 * Zod Schemas for AI-generated Structured Data
 * Used with AI SDK's generateObject for type-safe outputs
 */

import { z } from 'zod';

/**
 * Schema for chat title generation
 */
export const TitleSchema = z.object({
  title: z.string().max(100).describe('A concise 3-5 word title summarizing the conversation'),
});

export type TitleOutput = z.infer<typeof TitleSchema>;

/**
 * Schema for follow-up question generation
 */
export const FollowUpsSchema = z.object({
  followUps: z
    .array(z.string().max(200).describe('A relevant follow-up question'))
    .max(5)
    .describe('Array of follow-up questions the user might ask next'),
});

export type FollowUpsOutput = z.infer<typeof FollowUpsSchema>;

/**
 * Schema for reasoning/thinking extraction
 * Useful for models that support structured reasoning output
 */
export const ReasoningSchema = z.object({
  thinking: z.string().describe('Internal reasoning process'),
  conclusion: z.string().describe('Final conclusion after reasoning'),
});

export type ReasoningOutput = z.infer<typeof ReasoningSchema>;

/**
 * Schema for code generation with explanation
 */
export const CodeGenerationSchema = z.object({
  language: z.string().describe('Programming language of the code'),
  code: z.string().describe('The generated code'),
  explanation: z.string().describe('Brief explanation of what the code does'),
});

export type CodeGenerationOutput = z.infer<typeof CodeGenerationSchema>;

/**
 * Schema for step-by-step instructions
 */
export const InstructionsSchema = z.object({
  steps: z
    .array(
      z.object({
        step: z.number().describe('Step number'),
        title: z.string().describe('Short title for the step'),
        description: z.string().describe('Detailed description of what to do'),
      })
    )
    .describe('Array of steps to complete the task'),
});

export type InstructionsOutput = z.infer<typeof InstructionsSchema>;
