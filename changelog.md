# Changelog

## 0.0.1

* Initial release

## 0.0.2

* README spacing mistake

## 0.0.3

* Loosen sequelize dependency version to v2.x.x
* Update mysql module dependency in line with sequelize v2.1.0
* Update lodash dependency
* Update dev dependencies
* README contribution section

## 0.0.4

* Remove relative path to sequelize in tests

## 0.1.0

* Support for Sequelize v3.x.x
* Update dev dependencies in line with Sequelize v3.2.0
* Travis runs tests with Sequelize v3 and v2
* Tests for `getValues()` on basic values
* Test code coverage & Travis sends to coveralls
* Run jshint on tests
* Disable Travis dependency cache
* Update README badges to use shields.io

## 0.1.1

* MSSQL config for tests

## 0.1.2

* Patch for `instance.options` renamed `$options` in Sequelize v3.9.0
* Update dependency mysql in line with Sequelize v3.8.0
* Update dependency lodash
* Update dev dependencies

## 1.0.0

* Support Sequelize v4.x.x
* Support only Node v4 upwards
* `getValuesDedup()` removes duplicate IDs from HasMany includes
* New tests
* Code comments
* Update dev dependencies
* Replace `Makefile` with npm scripts
* Travis CI runs on all branches (to support greenkeeper.io)
* Drop testing on Travis CI for `mariadb` + `mssql` dialects
* Increase tests timeout to 30 seconds
* `.DS_Store` in `.gitignore`
* README update
* npm keywords
* Update license

## 1.0.1

* Update `lodash` dependency

## 1.1.0

* Remove Sequelize peer dependency to fix Travis fails
