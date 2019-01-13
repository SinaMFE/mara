# Schema Utils

JSON Schema Validator. Extracted from [webpack](https://github.com/webpack/webpack).
Feature: Customize error messages with the `description` properties.

## Install

```bash
yarn add @mara/schema-utils
```

## Usage

schema.json

```json
{
  "type": "object",
  "properties": {
    "name": {
      // custom error message
      "description": "name description",
      "type": "string"
    },
    "test": {
      "anyOf": [
        { "type": "array" },
        { "type": "string" },
        { "instanceof": "RegExp" }
      ]
    },
    "transform": {
      "instanceof": "Function"
    },
    "sourceMap": {
      "type": "boolean"
    }
  },
  "additionalProperties": false
}
```

```javascript
import schema from 'path/to/schema.json'
import validateOptions from '@mara/schema-utils'

const inputOptions = {
  name: 'hello'
}
const valid = validateOptions(schema, inputOptions, 'Config Filename')

if (valid) {
  // do something...
}
```
