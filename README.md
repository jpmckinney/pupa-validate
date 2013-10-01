# pupa-validate

Validates JSON documents dumped by Pupa against JSON Schema.

## Usage

    npm install pupa-validate

Display help and usage details:

    pupa-validate -h

Read JSON documents from a different directory:

    pupa-validate --output_dir /tmp/scraped_data

Read JSON documents from a Redis database (the `redis` package must be available):

    pupa-validate --output_dir redis://127.0.0.1:6379/0

Validate JSON documents whose `_type` is `organization` against `http://popoloproject.com/schemas/organization.json#`:

    pupa-validate organization http://popoloproject.com/schemas/organization.json#

## Bugs? Questions?

This project's main repository is on GitHub: [http://github.com/opennorth/pupa-ruby](http://github.com/opennorth/pupa-ruby), where your contributions, forks, bug reports, feature requests, and feedback are greatly welcomed.

Copyright (c) 2013 Open North Inc., released under the MIT license
