import { Badge } from '@components/common/ui/Badge.js';
import React from 'react';
import type { JobStatus } from '../services/job/types.js';
import { statusLabel, statusTone } from './labels.js';

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={statusTone(status)}>{statusLabel(status)}</Badge>;
}
