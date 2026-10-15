/// <reference types="jasmine" />

declare module 'jasmine-core' {
  const jasmineCore: { jasmine: typeof globalThis.jasmine };
  export default jasmineCore;
}
