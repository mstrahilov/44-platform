export function isMissingColumnError(error: { message?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return message.includes('schema cache')
    || message.includes('could not find the')
    || message.includes('column')
    || error.code === 'PGRST204';
}

export function isMissingRelationError(error: { message?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return isMissingColumnError(error)
    || message.includes('relation')
    || message.includes('table')
    || message.includes('does not exist')
    || error.code === '42P01'
    || error.code === 'PGRST205';
}

export function isMissingFunctionError(error: { message?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return message.includes('could not find the function')
    || message.includes('function') && message.includes('schema cache')
    || error.code === 'PGRST202'
    || error.code === '42883';
}
