import assert from 'node:assert/strict';
// VM callbacks mutate hosts outside TypeScript's control-flow analysis. These
// signatures preserve runtime assertions without narrowing mutable test hosts.
type RuntimeAssertions = Omit<
  typeof assert,
  'equal' | 'strictEqual' | 'deepEqual' | 'deepStrictEqual' | 'ok'
> & {
  equal(actual: unknown, expected: unknown, message?: string | Error): void;
  strictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  deepEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  deepStrictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  ok(actual: unknown, message?: string | Error): void;
};
export default assert as RuntimeAssertions;
