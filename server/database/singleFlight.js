/** Share only an in-flight operation. A failure remains retryable; results are not cached. */
export function singleFlight(operation) {
  let pending;
  return (...args) => {
    if (pending) return pending;
    const current = Promise.resolve().then(() => operation(...args));
    pending = current;
    const release = () => { if (pending === current) pending = undefined; };
    current.then(release, release);
    return current;
  };
}
