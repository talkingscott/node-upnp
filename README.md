# node-upnp

Minimal UPnP explorer (initial development)

## Overview

The initial goal is to find media server content directories, then use
the control interface to navigate the content, in particular music content.

Coding of the control module and associated test are in progress.

## Test Apps

These apps have been used to test some capabilities.  In large part, the tests build on
one another.

* soap-test.js
* discovery-test.js, discovery-dump.js, discovery-listen-only.js
* description-test.js
* control-test.js

## Notes to self

To support VS Code ESLint extension
```
npm install --save-dev eslint
node node_modules/eslint/bin/eslint.js --init
# answer questions...
```