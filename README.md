# sequelize-values.js

# Easily get raw data from Sequelize instances

## Current status

[![Build Status](https://secure.travis-ci.org/overlookmotel/sequelize-values.png?branch=master)](http://travis-ci.org/overlookmotel/sequelize-values)
[![Dependency Status](https://david-dm.org/overlookmotel/sequelize-values.png)](https://david-dm.org/overlookmotel/sequelize-values)

## Usage

### Loading module

To load module:

```js
var Sequelize = require('sequelize-values')();
// NB Sequelize must also be present in `node_modules`
```

or, a more verbose form useful if chaining multiple Sequelize plugins:

```js
var Sequelize = require('sequelize');
require('sequelize-values')(Sequelize);
```

## Tests

Use `npm test` to run the tests.
Requires a database called 'sequelize_test' and a db user 'sequelize_test' with no password.

## Changelog

See changelog.md

## Issues

If you discover a bug, please raise an issue on Github. https://github.com/overlookmotel/sequelize-values/issues

## Contribution

Pull requests are very welcome. Please:

* fork and issue PRs on `dev` branch
* ensure all tests pass before submitting PR
* add an entry to changelog
* add tests for new features
* document new functionality/API additions in README

`master` branch is always the most recent npm release. All new code is first added to `dev` branch for testing and only merged into `master` when it's ready to be published to npm.
