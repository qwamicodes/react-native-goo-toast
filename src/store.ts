import type {
  PromiseMessages,
  ToastButton,
  ToastItem,
  ToastOptions,
  ToastPosition,
  ToastState,
} from './types';

type Listener = () => void;
type Defaults = Partial<ToastOptions> & { position: ToastPosition };

let toasts: ToastItem[] = [];
let defaults: Defaults = { position: 'top-center', duration: 6000 };
let counter = 0;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l());

export const toastStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => toasts,
};

/** @internal Called by <Toaster /> to apply its defaults. */
export function setToastDefaults(next: Partial<Defaults>) {
  defaults = { ...defaults, ...next };
}

/** @internal Called by a toast once its exit animation finishes. */
export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function show(state: ToastState, options: ToastOptions, id?: string): string {
  const existing = id
    ? toasts.find((t) => t.id === id)
    : toasts.find((t) => t.position === (options.position ?? defaults.position) && !t.dismissed);

  if (existing && !existing.dismissed) {
    // One toast per position: morph the current one into the new content.
    const next: ToastItem = {
      ...defaults,
      ...options,
      id: existing.id,
      state,
      position: existing.position,
      version: existing.version + 1,
      dismissed: false,
    };
    toasts = toasts.map((t) => (t.id === existing.id ? next : t));
    emit();
    return existing.id;
  }

  const newId = `goo-${++counter}`;
  toasts = [
    ...toasts,
    {
      ...defaults,
      ...options,
      id: newId,
      state,
      position: options.position ?? defaults.position,
      version: 0,
      dismissed: false,
    },
  ];
  emit();
  return newId;
}

function resolve<T>(message: ToastOptions | ((v: T) => ToastOptions), value: T): ToastOptions {
  return typeof message === 'function' ? message(value) : message;
}

function dismiss(id: string) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, dismissed: true } : t));
  emit();
}

function clear(position?: ToastPosition) {
  toasts = toasts.map((t) => (!position || t.position === position ? { ...t, dismissed: true } : t));
  emit();
}

function promise<T>(task: Promise<T> | (() => Promise<T>), messages: PromiseMessages<T>): Promise<T> {
  const id = show('loading', { duration: null, ...messages.loading });
  const p = typeof task === 'function' ? task() : task;
  p.then(
    (value) => show('success', resolve(messages.success, value), id),
    (error: unknown) => show('error', resolve(messages.error, error), id),
  );
  return p;
}

/**
 * Fire toasts from anywhere.
 *
 * ```ts
 * toast.success({ title: 'Saved' });
 * toast.promise(save(), { loading: { title: 'Saving' }, success: { title: 'Saved' }, error: { title: 'Failed' } });
 * ```
 */
export const toast = Object.assign((options: ToastOptions) => show('info', options), {
  success: (options: ToastOptions) => show('success', options),
  error: (options: ToastOptions) => show('error', options),
  warning: (options: ToastOptions) => show('warning', options),
  info: (options: ToastOptions) => show('info', options),
  action: (options: ToastOptions & { button: ToastButton }) => show('action', options),
  loading: (options: ToastOptions) => show('loading', { duration: null, ...options }),
  /** Change an existing toast in place; it morphs to the new content. */
  update: (id: string, state: ToastState, options: ToastOptions) => show(state, options, id),
  promise,
  dismiss,
  clear,
});
