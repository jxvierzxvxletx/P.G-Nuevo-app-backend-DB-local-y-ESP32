type RefreshListener = () => void;

let listeners: RefreshListener[] = [];

export function subscribeToAppRefresh(listener: RefreshListener) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

export function emitAppRefresh() {
  listeners.forEach((listener) => listener());
}