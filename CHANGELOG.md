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



