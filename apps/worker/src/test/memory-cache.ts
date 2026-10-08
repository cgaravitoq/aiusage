import { vi } from "vitest";

export function stubCaches(): Map<string, Response> {
  const store = new Map<string, Response>();
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (key: string) => store.get(key)?.clone(),
      put: async (key: string, response: Response) => {
        store.set(key, response);
      },
    }),
  });
  return store;
}
