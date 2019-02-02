## [4.2.1](https://github.com/nfroidure/swagger-http-router/compare/v4.2.0...v4.2.1) (2019-02-02)



# [4.2.0](https://github.com/nfroidure/swagger-http-router/compare/v4.1.0...v4.2.0) (2018-11-22)


### Bug Fixes

* **Tests:** Ensure that body checks reflect real world usage ([70f2fe6](https://github.com/nfroidure/swagger-http-router/commit/70f2fe6))



# [4.1.0](https://github.com/nfroidure/swagger-http-router/compare/v4.0.0...v4.1.0) (2018-11-11)


### Bug Fixes

* **httpRouter:** Avoid mutating the injected API object ([7ff3eb8](https://github.com/nfroidure/swagger-http-router/commit/7ff3eb8)), closes [#9](https://github.com/nfroidure/swagger-http-router/issues/9)


### Features

* **httpRouter:** Add some more check to the API definition ([d295b95](https://github.com/nfroidure/swagger-http-router/commit/d295b95)), closes [#6](https://github.com/nfroidure/swagger-http-router/issues/6) [#7](https://github.com/nfroidure/swagger-http-router/issues/7)



# [4.0.0](https://github.com/nfroidure/swagger-http-router/compare/v3.0.0...v4.0.0) (2018-11-04)


### chore

* **Dependencies:** Update dependencies ([e34c7f8](https://github.com/nfroidure/swagger-http-router/commit/e34c7f8))


### BREAKING CHANGES

* **Dependencies:** Drop support for Node < 8



<a name="3.0.0"></a>
# [3.0.0](https://github.com/nfroidure/swagger-http-router/compare/v2.0.0...v3.0.0) (2018-10-21)


### Code Refactoring

* **HTTPServer:** Avoid picking HOST/PORT in ENV ([58beb67](https://github.com/nfroidure/swagger-http-router/commit/58beb67)), closes [#8](https://github.com/nfroidure/swagger-http-router/issues/8)


### Features

* **httpServer:** Add new HTTP server options ([cfb01c5](https://github.com/nfroidure/swagger-http-router/commit/cfb01c5))


### BREAKING CHANGES

* **HTTPServer:** The HOST/PORT constants must now be set instead of setting it to ENV.



<a name="2.0.0"></a>
# [2.0.0](https://github.com/nfroidure/swagger-http-router/compare/v1.6.3...v2.0.0) (2018-10-14)


### Bug Fixes

* **httpTransaction:** Repair error casting when YHTTPError instances are different ([ed99b8f](https://github.com/nfroidure/swagger-http-router/commit/ed99b8f))



<a name="1.6.3"></a>
## [1.6.3](https://github.com/nfroidure/swagger-http-router/compare/v1.6.2...v1.6.3) (2018-09-16)


### Bug Fixes

* **Tests:** Fix meaningless failures between Node versions ([abab401](https://github.com/nfroidure/swagger-http-router/commit/abab401))



<a name="1.6.2"></a>
## [1.6.2](https://github.com/nfroidure/swagger-http-router/compare/v1.6.1...v1.6.2) (2018-05-17)


### Bug Fixes

* **Build:** Fix the Babel build for AWS Lambdas ([8be86c1](https://github.com/nfroidure/swagger-http-router/commit/8be86c1))



<a name="1.6.1"></a>
## [1.6.1](https://github.com/nfroidure/swagger-http-router/compare/v1.6.0...v1.6.1) (2018-05-06)



<a name="1.6.0"></a>
# [1.6.0](https://github.com/nfroidure/swagger-http-router/compare/v1.5.3...v1.6.0) (2018-04-11)


### Features

* **HTTPRouter:** Allow to inject a different query parser ([d00b712](https://github.com/nfroidure/swagger-http-router/commit/d00b712)), closes [#5](https://github.com/nfroidure/swagger-http-router/issues/5)
* **HTTPServer:** Allow to destroy sockets for a quicker shutdown ([9467680](https://github.com/nfroidure/swagger-http-router/commit/9467680)), closes [#4](https://github.com/nfroidure/swagger-http-router/issues/4)


### Performance Improvements

* **HTTPServer:** Avoid keeping track of opened sockets when unuseful ([2d15098](https://github.com/nfroidure/swagger-http-router/commit/2d15098))



<a name="1.5.3"></a>
## [1.5.3](https://github.com/nfroidure/swagger-http-router/compare/v1.5.2...v1.5.3) (2018-03-18)


### Bug Fixes

* **NPM:** Fix main file ([e33a5a8](https://github.com/nfroidure/swagger-http-router/commit/e33a5a8))



<a name="1.5.2"></a>
## [1.5.2](https://github.com/nfroidure/swagger-http-router/compare/v1.5.1...v1.5.2) (2018-03-18)



<a name="1.5.1"></a>
## [1.5.1](https://github.com/nfroidure/swagger-http-router/compare/v1.5.0...v1.5.1) (2018-03-18)


### Bug Fixes

* **HTTPTransaction:** Prevent conflicts for transaction ids ([a6ac5c5](https://github.com/nfroidure/swagger-http-router/commit/a6ac5c5))



<a name="1.5.0"></a>
# [1.5.0](https://github.com/nfroidure/swagger-http-router/compare/v1.4.0...v1.5.0) (2018-03-18)



<a name="1.4.0"></a>
# [1.4.0](https://github.com/nfroidure/swagger-http-router/compare/v1.3.0...v1.4.0) (2018-03-07)


### Features

* **PARSERS:** Allow async parsers (for multipart/form-data support) ([3ddd90c](https://github.com/nfroidure/swagger-http-router/commit/3ddd90c))



<a name="1.3.0"></a>
# [1.3.0](https://github.com/nfroidure/swagger-http-router/compare/v1.2.1...v1.3.0) (2017-11-12)


### Features

* **errorHandler:** Inject and expose the errorHandler ([5b905a7](https://github.com/nfroidure/swagger-http-router/commit/5b905a7)), closes [#2](https://github.com/nfroidure/swagger-http-router/issues/2)
* **PARSERS/STRINGIFYERS:** Add `application/x-www-form-urlencoded` support ([8afd402](https://github.com/nfroidure/swagger-http-router/commit/8afd402))



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



