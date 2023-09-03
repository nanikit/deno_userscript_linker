export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (result: T) => void;
  reject: (error: unknown) => void;
};

export function defer<T>(): Deferred<T> {
  let resolve, reject;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject } as unknown as Deferred<T>;
}
