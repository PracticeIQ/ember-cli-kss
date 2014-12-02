# Ember-cli-kss

This README outlines the details of collaborating on this Ember addon.

## Installation

* `git clone` this repository
* `npm install`
* `bower install`

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).

Implementation notes:
When customizing the template, a tidier approach could be placing the kss template dir inside app/styles.
This was the initial approach taken, but in practice this introduced an additional ~1000ms into the sass
recompilation cycle, which was deemed unacceptable.