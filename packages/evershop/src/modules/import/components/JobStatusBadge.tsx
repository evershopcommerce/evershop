import { Badge } from '@components/common/ui/Badge.js';
import React from 'react';
import type { JobStatus } from '../services/job/types.js';
import { statusLabel, statusTone } from './labels.js';

/**
 * The state of a job. `errors` is what the check found: a file that was checked
 * is red when it has errors and green when it is ready to start.
 */
export function JobStatusBadge({
  status,
  errors
}: {
  status: JobStatus;
  errors?: number | null;
}) {
  return (
    <Badge variant={statusTone(status, errors)}>{statusLabel(status)}</Badge>
  );
}
