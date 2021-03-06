# pupa-validate

[![NPM version](https://badge.fury.io/js/pupa-validate.svg)](https://badge.fury.io/js/pupa-validate)
[![Build Status](https://secure.travis-ci.org/jpmckinney/pupa-validate.png)](https://travis-ci.org/jpmckinney/pupa-validate)
[![Dependency Status](https://david-dm.org/jpmckinney/pupa-validate.svg)](https://david-dm.org/jpmckinney/pupa-validate)
[![Coverage Status](https://coveralls.io/repos/jpmckinney/pupa-validate/badge.png)](https://coveralls.io/r/jpmckinney/pupa-validate)

Validates multiple JSON documents on disk or in Redis against JSON Schema.

You may use this package to validate documents created by [Pupa.rb](https://github.com/jpmckinney/pupa-ruby).

## Usage

    npm install pupa-validate

Display help and usage details:

    pupa-validate -h

Read JSON documents from a different directory:

    pupa-validate --output_dir /tmp/scraped_data

Read JSON documents from a Redis database (the `redis` package must be available):

    pupa-validate --output_dir redis://127.0.0.1:6379/0

Validate JSON documents whose `_type` is `organization` against `http://popoloproject.com/schemas/organization.json#`:

    pupa-validate organization http://www.popoloproject.com/schemas/organization.json#

## Testing

**DO NOT** run this module's tests if you are using Redis database number 15 on `localhost`!

## See Also

* [Pupa.rb](https://github.com/jpmckinney/pupa-ruby), a Ruby data scraping framework
* [Pupa](https://github.com/opencivicdata/pupa), the original Python data scraping framework

Copyright (c) 2013 James McKinney, released under the MIT license
