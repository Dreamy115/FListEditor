/** Minimal synthetic event shape used by VM-installed handlers in unit tests. */
export interface TestEvent {
  target?: {
    checked?: boolean;
    value?: string;
    files?: { name: string; size: number; text(): Promise<string> }[];
  };
  key?: string;
  code?: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  repeat?: boolean;
  preventDefault?(): void;
}
/** VM handlers accept synthetic events and may finish asynchronously. */
export type TestHandler = (event?: TestEvent) => void | Promise<void>;
/** The small mutable part of a DOM control exercised by isolated unit tests. */
export interface TestControl {
  options?: { value: string }[];
  checked?: boolean;
  disabled?: boolean;
  textContent?: string;
  addEventListener(type: string, handler: TestHandler): void;
}
