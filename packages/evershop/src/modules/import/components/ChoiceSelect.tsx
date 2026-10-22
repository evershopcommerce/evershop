import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@components/common/ui/Select.js';
import React from 'react';

export interface Choice {
  value: string;
  label: string;
}

export interface ChoiceSelectProps {
  /** Lets a visible `<Label htmlFor>` name the select. */
  id?: string;
  /** The name for a screen reader, when no visible label points at the select. */
  label?: string;
  value: string;
  choices: readonly Choice[];
  onChange(value: string): void;
  disabled?: boolean;
  className?: string;
}

// The select of the core holds no empty value, and "All statuses" is the empty one of a filter.
const EMPTY = '__empty__';
const keyOf = (value: string) => (value === '' ? EMPTY : value);

/**
 * One choice among a few, as the admin shows it everywhere: the `Select` of the
 * core, not the one of the browser. The value is a string; an empty one stands
 * for "no filter".
 */
export function ChoiceSelect(props: ChoiceSelectProps) {
  const { choices, value } = props;
  return (
    <Select
      value={keyOf(value)}
      disabled={props.disabled}
      onValueChange={(next) => {
        if (next !== null) props.onChange(next === EMPTY ? '' : String(next));
      }}
    >
      <SelectTrigger
        id={props.id}
        aria-label={props.label}
        className={props.className}
      >
        <SelectValue>
          {choices.find((choice) => choice.value === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={keyOf(choice.value)}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
