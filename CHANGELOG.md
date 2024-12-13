# [5.0.0](https://github.com/nicojs/typed-inject/compare/v4.0.0...v5.0.0) (2024-12-13)


### Features

* **child injector:** Add `createChildInjector` ([#72](https://github.com/nicojs/typed-inject/issues/72)) ([e103564](https://github.com/nicojs/typed-inject/commit/e10356495f27428db85c6a074f369364cfad4871))
* improve error messages ([#66](https://github.com/nicojs/typed-inject/issues/66)) ([64f7640](https://github.com/nicojs/typed-inject/commit/64f7640a68b76b3d4cac979110798333339309e4))
* **node:** drop support for node 16 ([#71](https://github.com/nicojs/typed-inject/issues/71)) ([028cd45](https://github.com/nicojs/typed-inject/commit/028cd4553383521e9b7761bba327d545faabf4cc))


### BREAKING CHANGES

* **node:** Please use Node 18 or higher



# [4.0.0](https://github.com/nicojs/typed-inject/compare/v3.0.1...v4.0.0) (2023-05-05)


### Features

* **esm:** migrate to native esm ([#53](https://github.com/nicojs/typed-inject/issues/53)) ([b8efb26](https://github.com/nicojs/typed-inject/commit/b8efb26029bd5b683a5ac194ebfcbe8f0823db6b))
* **Node version:** set minimal node version to v16 ([#62](https://github.com/nicojs/typed-inject/issues/62)) ([585c99e](https://github.com/nicojs/typed-inject/commit/585c99e106e58ceae11ed4ccd493a07fc26662e5))
* **node:** drop support for node 10 and 12 ([#54](https://github.com/nicojs/typed-inject/issues/54)) ([c9f63bb](https://github.com/nicojs/typed-inject/commit/c9f63bb811783e343a8536c58e25d2f4f30dcb53))


### BREAKING CHANGES

* **Node version:** Node 14 is no longer officially supported (although it might still work).
* **node:** Node v10 and v12 are no longer supported.
* **esm:** typed-inject is now a pure ESM. Please [read this](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)



## [3.0.1](https://github.com/nicojs/typed-inject/compare/v3.0.0...v3.0.1) (2021-10-11)


### Bug Fixes

* **dispose:** Remove injector from parent on dispose ([#38](https://github.com/nicojs/typed-inject/issues/38)) ([2b17195](https://github.com/nicojs/typed-inject/commit/2b17195f1db1bfcbd2f4cf735d042ff25a53e810))



# [3.0.0](https://github.com/nicojs/typed-inject/compare/v2.2.0...v3.0.0) (2020-08-12)


### Bug Fixes

* **dist:** distribute ts alongside dist js code ([#21](https://github.com/nicojs/typed-inject/issues/21)) ([0b178b5](https://github.com/nicojs/typed-inject/commit/0b178b5f8fa919a421e96d22f30e28ab179a2417))


### Features

* **as const:** allow to declare tokens as const ([#27](https://github.com/nicojs/typed-inject/issues/27)) ([05435b7](https://github.com/nicojs/typed-inject/commit/05435b7c5018d30a0df7a8f06948284cd678262b))
* **dispose:** dispose child injectors ([#29](https://github.com/nicojs/typed-inject/issues/29)) ([3f0f3f5](https://github.com/nicojs/typed-inject/commit/3f0f3f58f990a2f68e9545c5c0f0ba7b2c3a50b7))
* **maintanance:** drop node 8 support ([#28](https://github.com/nicojs/typed-inject/issues/28)) ([cdf3c30](https://github.com/nicojs/typed-inject/commit/cdf3c3046fd320d63be3e950d15d31b83d2679ec))


### BREAKING CHANGES

* **dispose:** `rootInjector` is removed in favor of `createInjector`.

This:

```
import { rootInjector } from 'typed-inject';
```

Becomes:

```
import { createInjector } from 'typed-inject';
const rootInjector = createInjector();
```

Injector's created from `createInjector` are no longer stateless. They
keep track of their child injectors.
* **dispose:** `dispose` no longer disposes parent injector, disposes
the child injectors instead. See readme for more details.
* **maintanance:** Node 8 is no longer supported.
* **as const:** The typed-inject is now expecting tokens to be provided in a `readonly` array. You can either use `as const` or the `tokens` helper function for it.



## [2.2.1](https://github.com/nicojs/typed-inject/compare/v2.2.0...v2.2.1) (2020-03-22)


### Bug Fixes

* **dist:** distribute ts allongside dist js code ([5d7dbf0](https://github.com/nicojs/typed-inject/commit/5d7dbf08ee79a2e1d732d0d3883a160a7e901465))



# [2.2.0](https://github.com/nicojs/typed-inject/compare/v2.1.1...v2.2.0) (2020-03-21)


### Bug Fixes

* **deps:** move typescript to devDependencies ([17532cd](https://github.com/nicojs/typed-inject/commit/17532cd465a282919075a1e2e0d7361fb0122408))


### Features

* **error handling:** add a way to handle errors ([dbe3bfd](https://github.com/nicojs/typed-inject/commit/dbe3bfde8b63c6bcb7053dfe12c2bed2b49f53dd))



## [2.1.1](https://github.com/nicojs/typed-inject/compare/v2.1.0...v2.1.1) (2019-09-12)


### Bug Fixes

* **tslib:** remove implicit dependency on tslib ([#8](https://github.com/nicojs/typed-inject/issues/8)) ([7fe01aa](https://github.com/nicojs/typed-inject/commit/7fe01aa))



# [2.1.0](https://github.com/nicojs/typed-inject/compare/v2.0.0...v2.1.0) (2019-05-03)


### Features

* **decorator:** add decorator functionality ([#6](https://github.com/nicojs/typed-inject/issues/6)) ([1508107](https://github.com/nicojs/typed-inject/commit/1508107))



# [2.0.0](https://github.com/nicojs/typed-inject/compare/v1.0.0...v2.0.0) (2019-05-02)


### Features

* **async dispose:** allow asynchronous `dispose` ([#4](https://github.com/nicojs/typed-inject/issues/4)) ([c1167ae](https://github.com/nicojs/typed-inject/commit/c1167ae))
* **dispose-order:** change dispose order to a stack ([#3](https://github.com/nicojs/typed-inject/issues/3)) ([257df91](https://github.com/nicojs/typed-inject/commit/257df91))
* **node 6:** drop support for node 6 ([#5](https://github.com/nicojs/typed-inject/issues/5)) ([d3e4e85](https://github.com/nicojs/typed-inject/commit/d3e4e85))


### BREAKING CHANGES

* **node 6:** Node 6 is no longer supported.
* **async dispose:** Dependencies are now disposed of asynchronously (while still honoring the order of "child first"). You should now `await` the result of `injector.dispose()`.



# [1.0.0](https://github.com/nicojs/typed-inject/compare/v0.2.1...v1.0.0) (2019-02-12)



## [0.2.1](https://github.com/nicojs/typed-inject/compare/v0.2.0...v0.2.1) (2019-02-11)


### Features

* **dispose:** Add functionality to explicit disposing of dependencies ([#1](https://github.com/nicojs/typed-inject/issues/1)) ([02b4946](https://github.com/nicojs/typed-inject/commit/02b4946))



# [0.2.0](https://github.com/nicojs/typed-inject/compare/v0.1.1...v0.2.0) (2019-02-05)


### Features

* **covariant injector:** Injector interface covariance ([46058a8](https://github.com/nicojs/typed-inject/commit/46058a8))


### BREAKING CHANGES

* **covariant injector:** It is no longer possible to resolve
`TARGET_TOKEN` or `INJECTOR_TOKEN` directly from an
 `Injector` using `resolve`. I don't see a use case for that,
so it's no big deal



## [0.1.1](https://github.com/nicojs/typed-inject/compare/v0.1.0...v0.1.1) (2019-01-26)



# 0.1.0 (2019-01-25)



