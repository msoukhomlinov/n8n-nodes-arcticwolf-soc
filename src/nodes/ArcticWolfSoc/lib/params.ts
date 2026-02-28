import type { IDataObject } from 'n8n-workflow';

export interface ListTicketsParams {
  status?: string[];
  priority?: string;
  type?: string;
  assigneeByEmail?: string;
  assigneeByFirstName?: string;
  assigneeByLastName?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
  includeComments?: boolean;
}

export function buildListTicketsQs(opts: ListTicketsParams): IDataObject {
  const qs: IDataObject = {
    limit: opts.limit ?? 20,
    offset: opts.offset ?? 0,
  };
  if (opts.status && opts.status.length > 0) qs['status'] = opts.status;
  if (opts.priority) qs['priority'] = opts.priority;
  if (opts.type) qs['type'] = opts.type;
  if (opts.assigneeByEmail) qs['assigneeByEmail'] = opts.assigneeByEmail;
  if (opts.assigneeByFirstName) qs['assigneeByFirstName'] = opts.assigneeByFirstName;
  if (opts.assigneeByLastName) qs['assigneeByLastName'] = opts.assigneeByLastName;
  if (opts.updatedAfter) qs['updatedAfter'] = opts.updatedAfter;
  if (opts.updatedBefore) qs['updatedBefore'] = opts.updatedBefore;
  if (opts.createdAfter) qs['createdAfter'] = opts.createdAfter;
  if (opts.createdBefore) qs['createdBefore'] = opts.createdBefore;
  if (opts.includeComments) qs['includeComments'] = true;
  return qs;
}
