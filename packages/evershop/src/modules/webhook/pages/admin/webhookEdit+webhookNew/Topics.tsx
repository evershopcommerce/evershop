import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@components/common/ui/Accordion.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { Checkbox } from '@components/common/ui/Checkbox.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

interface Topic {
  name: string;
  label: string;
  description: string;
  group: string;
}

interface TopicsProps {
  webhookTopics: Topic[];
  webhook?: { topics?: string[] } | null;
}

/** Accordion value of the "No longer available" group. */
const GONE_GROUP = '__no_longer_available__';

/** Topics grouped by their `group`, in the order they were registered. */
function groupTopics(topics: Topic[]): Array<[string, Topic[]]> {
  const groups = new Map<string, Topic[]>();
  topics.forEach((topic) => {
    groups.set(topic.group, [...(groups.get(topic.group) ?? []), topic]);
  });
  return [...groups.entries()];
}

function summary(selected: number, total: number): string {
  if (selected === 0) {
    return _('None selected');
  }
  return _('${selected} of ${total} selected', {
    selected: String(selected),
    total: String(total)
  });
}

function GroupHeader({
  title,
  summaryText
}: {
  title: string;
  summaryText: string;
}) {
  return (
    <span className="flex flex-1 items-center justify-between pr-2">
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground font-normal">
        {summaryText}
      </span>
    </span>
  );
}

export default function Topics({ webhookTopics, webhook }: TopicsProps) {
  const { control } = useFormContext();
  const saved = webhook?.topics ?? [];
  const known = new Set(webhookTopics.map((t) => t.name));
  // A saved topic whose event is no longer registered (an extension was
  // removed): show it by its code so the admin can untick it.
  const gone = saved.filter((name) => !known.has(name));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Events')}</CardTitle>
        <CardDescription>
          {_(
            'Choose the events to send to this URL. Order, shipment and customer events include personal data such as names, emails and addresses.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Controller
          name="topics"
          control={control}
          defaultValue={saved}
          rules={{
            validate: (value: string[]) =>
              (Array.isArray(value) && value.length > 0) ||
              _('Select at least one event')
          }}
          render={({ field, fieldState }) => {
            const selected: string[] = Array.isArray(field.value)
              ? field.value
              : [];
            const toggle = (name: string, checked: boolean) =>
              field.onChange(
                checked
                  ? [...selected, name]
                  : selected.filter((item) => item !== name)
              );
            return (
              <div className="space-y-3">
                {/* Collapsed by default: the list is long. The selection lives
                    in the form state, not in the checkboxes, so a collapsed
                    group keeps (and saves) what was ticked. The "no longer
                    available" group starts open because it needs a decision. */}
                <Accordion
                  multiple
                  defaultValue={gone.length > 0 ? [GONE_GROUP] : []}
                  className="border rounded border-border divide-y divide-border"
                >
                  {groupTopics(webhookTopics).map(([group, topics]) => (
                    <AccordionItem key={group} value={group} className="px-3">
                      <AccordionTrigger className="py-3">
                        <GroupHeader
                          title={group}
                          summaryText={summary(
                            topics.filter((t) => selected.includes(t.name))
                              .length,
                            topics.length
                          )}
                        />
                      </AccordionTrigger>
                      <AccordionContent>
                        {topics.map((topic) => (
                          <label
                            key={topic.name}
                            className="flex items-start gap-3 py-2 cursor-pointer"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={selected.includes(topic.name)}
                              onCheckedChange={(checked) =>
                                toggle(topic.name, checked === true)
                              }
                            />
                            <span>
                              <span className="block font-medium">
                                {topic.label}
                              </span>
                              {topic.description && (
                                <span className="block text-sm text-muted-foreground">
                                  {topic.description}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  {gone.length > 0 && (
                    <AccordionItem value={GONE_GROUP} className="px-3">
                      <AccordionTrigger className="py-3">
                        <GroupHeader
                          title={_('No longer available')}
                          summaryText={summary(
                            gone.filter((name) => selected.includes(name))
                              .length,
                            gone.length
                          )}
                        />
                      </AccordionTrigger>
                      <AccordionContent>
                        {gone.map((name) => (
                          <label
                            key={name}
                            className="flex items-start gap-3 py-2 cursor-pointer"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={selected.includes(name)}
                              onCheckedChange={(checked) =>
                                toggle(name, checked === true)
                              }
                            />
                            <span>
                              <span className="block font-mono text-sm">
                                {name}
                              </span>
                              <span className="block text-sm text-muted-foreground">
                                {_(
                                  'This event is no longer provided. Untick it to remove it.'
                                )}
                              </span>
                            </span>
                          </label>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
                {fieldState.error && (
                  <p role="alert" className="text-sm text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'wideScreen',
  sortOrder: 20
};

export const query = `
  query Query {
    webhookTopics {
      name
      label
      description
      group
    }
    webhook(id: getContextValue("webhookUuid", null)) {
      topics
    }
  }
`;
