# Depart [![NPM version](https://badge.fury.io/js/depart.svg)](https://badge.fury.io/js/depart) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Caution

Depart is in a pre-release state and is subject to frequent breaking changes. Merge requests will be ignored and issues are disabled until v1.0.0, the first production ready release.

## Synopsis

Depart is express middleware for handling `multipart/form-data`. It is also usable as a standalone request processor. 

## Features

- Strongly typed via TypeScript
- Promises & async/await friendly.
- Supports streaming each file to multiple storage methods simultaneously, without the need to store on disk first. 


## Installation

```sh
$ npm install --save depart
```

## Usage

Depart's request processor class builds an object having `fields` and `files` properties. When using it as express middleware, the object is added to the express request under the property name `formData`.

API information coming soon...


## License

[MIT](LICENSE)
