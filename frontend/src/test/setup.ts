/**
 * Setup global des tests (Vitest).
 * - Active les matchers jest-dom (toBeInTheDocument, toHaveAttribute…)
 * - Nettoie le DOM après chaque test
 * - Remplace next/image, next/link et framer-motion par des équivalents
 *   légers pour que les composants se testent sans serveur Next.js.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Polyfill in-memory localStorage pour Node 26+
class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage,
  configurable: true,
  writable: true,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  cleanup();
  memoryStorage.clear();
});

// next/image → simple <img> (AssetImage l'utilise partout)
vi.mock("next/image", async () => {
  const React = await import("react");
  return {
    default: (props: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fill, sizes, priority, quality, ...rest } = props;
      return React.createElement("img", rest);
    },
  };
});

// next/link → simple <a>
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement("a", props, children as React.ReactNode),
  };
});

// framer-motion → rendu statique (les animations ne sont pas testées ici)
vi.mock("framer-motion", async () => {
  const React = await import("react");
  // Props d'animation ignorées pour un rendu simple
  const MOTION_ONLY_PROPS = new Set([
    "initial",
    "animate",
    "exit",
    "transition",
    "whileHover",
    "whileTap",
  ]);
  const createEl = (tag: string) => {
    const Component = React.forwardRef<unknown, Record<string, unknown>>(
      (props, ref) => {
        const rest: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
          if (!MOTION_ONLY_PROPS.has(key)) rest[key] = value;
        }
        return React.createElement(tag, { ...rest, ref });
      }
    );
    Component.displayName = `motion.${tag}`;
    return Component;
  };
  // Cache les composants motion.X : `motion.div` doit renvoyer la MÊME
  // référence à chaque rendu. Sinon, chaque re-render du parent crée un
  // nouveau type de composant et React démonte/remonte tout le sous-arbre
  // (état local des enfants perdu — bug visible dans les tests de ProductDetail).
  const motionCache = new Map<string, ReturnType<typeof createEl>>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!motionCache.has(tag)) motionCache.set(tag, createEl(tag));
        return motionCache.get(tag);
      },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});
