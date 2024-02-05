# b8-node

B8 is a Node.js module implementing a Bayesian filter. It allows you to classify any texts based on the training it receives.

## Installation

Install B8 using npm:

```bash
npm install b8-node
```

## Usage

### Importing B8

```javascript
const { B8 } = require('b8-node');
```

### Creating an Instance

Create an instance of B8:

```javascript
const b8 = new B8();
```

### Learning

Learn a text and assess its affinity or differences:

```javascript
await b8.learn('This is an example text with positive affinity.', 'positive');
```

### Unlearning

Unlearn a text and update the affinity assessment:

```javascript
await b8.unlearn('This is an example text with negative affinity.', 'negative');
```

### Classifying

Classify a text:

```javascript
const classificationResult = await b8.classify('This is a text to classify.');
console.log('Classification Result:', classificationResult);
```

### Dumping Context

Dump the internal context for debugging or persistence:

```javascript
const context = await b8.dumpContext();
console.log('B8 Context:', context);
```

### Providing Custom SQLite Database

You can provide a custom SQLite database for persistence. Pass the SQLite database path when creating the instance:

```javascript
const customDbPath = '/path/to/custom/database.sqlite';
const b8WithCustomDb = new B8({ dbPath: customDbPath });
```

## Contributing

Feel free to contribute by submitting issues or pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
