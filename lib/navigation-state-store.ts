// Cleared on account changes; never persisted to browser storage.
export const navigationState = new Map<string, unknown>();

export function clearNavigationState() {
  navigationState.clear();
}
