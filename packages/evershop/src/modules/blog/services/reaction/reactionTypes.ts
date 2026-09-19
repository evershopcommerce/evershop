/**
 * Post reaction types (v1 hardcoded list, per spec §4.5). Comments only ever
 * use 'like'.
 */
export const REACTION_TYPES = ['like', 'love', 'clap', 'insightful'] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export function isValidReactionType(value: unknown): value is ReactionType {
  return (
    typeof value === 'string' &&
    (REACTION_TYPES as readonly string[]).includes(value)
  );
}
