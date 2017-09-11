<a name="1.2.1"></a>
## [1.2.1](https://github.com/nfroidure/swagger-http-router/compare/v1.2.0...v1.2.1) (2017-09-11)


### Bug Fixes

* **Router:** Take in count user agents that sends charsets capitalized ([86d719f](https://github.com/nfroidure/swagger-http-router/commit/86d719f))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/nfroidure/swagger-http-router/compare/v1.1.0...v1.2.0) (2017-09-11)


### Features

* **Router:** Add a way to set headers for errors ([a84ff5a](https://github.com/nfroidure/swagger-http-router/commit/a84ff5a))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/nfroidure/swagger-http-router/compare/v1.0.1...v1.1.0) (2017-08-06)



<a name="1.0.1"></a>
## [1.0.1](https://github.com/nfroidure/swagger-http-router/compare/v1.0.0...v1.0.1) (2017-08-02)


### Bug Fixes

* **Router:** Support */* in the accept header ([17ff11c](https://github.com/nfroidure/swagger-http-router/commit/17ff11c)), closes [#1](https://github.com/nfroidure/swagger-http-router/issues/1)



<a name="1.0.0"></a>
# [1.0.0](https://github.com/nfroidure/swagger-http-router/compare/v0.2.0...v1.0.0) (2017-08-02)


### Features

* **Camelcaseify injected header parameters:** For a better API uniformization of handlers ([e6f1b08](https://github.com/nfroidure/swagger-http-router/commit/e6f1b08))


### BREAKING CHANGES

* **Camelcaseify injected header parameters:** Breaks previous headers usage



<a name="0.2.0"></a>
# [0.2.0](https://github.com/nfroidure/swagger-http-router/compare/v0.1.0...v0.2.0) (2017-07-29)


### Features

* **Utils:** Allow validation functions to be reused ([61a3bbc](https://github.com/nfroidure/swagger-http-router/commit/61a3bbc))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/nfroidure/swagger-http-router/compare/v0.0.3...v0.1.0) (2017-07-27)


### Bug Fixes

* **httpTransaction:** Fix the custom timeout setting ([8e21ace](https://github.com/nfroidure/swagger-http-router/commit/8e21ace))


### Features

* **Utils:** Allow internal useful functions to be used by this module consumers ([fbcb754](https://github.com/nfroidure/swagger-http-router/commit/fbcb754))



<a name="0.0.3"></a>
## [0.0.3](https://github.com/nfroidure/swagger-http-router/compare/v0.0.2...v0.0.3) (2017-07-12)


### Bug Fixes

* **Router:** Fix the router buffer size ([b1839d8](https://github.com/nfroidure/swagger-http-router/commit/b1839d8))
* **Transaction:** Fix the transaction timeout customization ([c19166d](https://github.com/nfroidure/swagger-http-router/commit/c19166d))



<a name="0.0.2"></a>
## [0.0.2](https://github.com/nfroidure/swagger-http-router/compare/v0.0.1...v0.0.2) (2017-06-16)


### Bug Fixes

* **Router:** Add response headers object in all case ([5b8f521](https://github.com/nfroidure/swagger-http-router/commit/5b8f521))



<a name="0.0.1"></a>
## 0.0.1 (2017-06-15)


### Bug Fixes

* **Content Negociation:** Take the operation `consumes` prop before the API one ([1c96dea](https://github.com/nfroidure/swagger-http-router/commit/1c96dea))
* **Tests:** Fix the tests when the NODE_ENV is changed ([b8d8638](https://github.com/nfroidure/swagger-http-router/commit/b8d8638))


### Features

* **Router:** First working version ([391119b](https://github.com/nfroidure/swagger-http-router/commit/391119b))



