let activeAnalyses = 0;
const MAX_CONCURRENT_ANALYSES = 3;

// Process-local capacity protection. Public deployments still need host-level limits and provider quotas.
export function reserveAnalysisSlot() {
  if (activeAnalyses >= MAX_CONCURRENT_ANALYSES) return null;
  activeAnalyses++;
  let released = false;
  return () => { if (!released) { activeAnalyses--; released = true; } };
}
