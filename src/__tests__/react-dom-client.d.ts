/**
 * Minimal ambient typing for react-dom/client, used only by the tests.
 * @types/react-dom is intentionally not a devDependency (the SDK treats
 * react-dom as an optional peer), so we declare just what the tests need.
 */
declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}
