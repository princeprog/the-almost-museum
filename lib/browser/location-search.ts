type LocationSearchListener = () => void;

const listeners = new Set<LocationSearchListener>();
let restoreHistory: (() => void) | undefined;

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function installHistoryListener(): void {
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  const pushState: History["pushState"] = (...args) => {
    originalPushState.apply(window.history, args);
    notifyListeners();
  };
  const replaceState: History["replaceState"] = (...args) => {
    originalReplaceState.apply(window.history, args);
    notifyListeners();
  };

  window.history.pushState = pushState;
  window.history.replaceState = replaceState;
  window.addEventListener("popstate", notifyListeners);
  restoreHistory = () => {
    window.removeEventListener("popstate", notifyListeners);
    if (window.history.pushState === pushState) window.history.pushState = originalPushState;
    if (window.history.replaceState === replaceState) window.history.replaceState = originalReplaceState;
  };
}

/** Subscribes static-exported client views to back/forward and same-page History API changes. */
export function subscribeToLocationSearch(listener: LocationSearchListener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) installHistoryListener();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      restoreHistory?.();
      restoreHistory = undefined;
    }
  };
}
