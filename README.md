# b8-node

B8 is a Node.js module implementing a Bayesian filter. It allows you to classify any texts based on the training it receives.

This repo is a JS refactoring of the [library "B8" created by Tobias Leupold](https://gitlab.com/l3u/b8). Learn more about here: https://nasauber.de/opensource/b8/readme.html#id45

B8 is a versatile text classification module that can be employed for a variety of applications, ranging from document analysis and email response categorization to log monitoring. It serves as a handy tool for text classification tasks where determining the relevance or affinity of content is essential.

## Key Features

- **Flexibility:** B8 is designed to handle diverse text classification needs, making it suitable for a wide array of applications.

- **Adaptable Learning:** The module supports learning from text sources, allowing users to teach the classifier about specific categories, such as spam or non-spam (ham).

- **Classification:** Utilize B8 to classify texts and gauge their relevance or categorization based on learned patterns.

## Use Cases

1. **Email Response Categorization:** Enhance email productivity by automatically categorizing incoming emails, prioritizing responses, and streamlining communication.

2. **Document Analysis:** Analyze and classify documents based on predefined categories, aiding in document organization and retrieval.

3. **Log Monitoring:** Monitor logs and identify patterns indicative of specific events, errors, or anomalies.

4. **Custom Applications:** Integrate B8 into custom applications for text-based classification needs in various domains.


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
const b8 = new B8({
	min_dev: 0.2,
	rob_s: 0.3,
	rob_x: 0.5,
	use_relevant: 15,
	lexer: {
		min_size: 3,
		max_size: 30,
		get_uris: true,
		get_html: true,
		get_bbcode: false,
		allow_numbers: false,
		stopwords: ['about', 'an', 'are', 'as', 'at', 'be', 'by', 'com', 'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where', 'who', 'will', 'with', 'www'],
	},
	degenerator: {
		multibyte: true,
		encoding: 'UTF-8',
	},
	storage: {
		dbPath: ':memory:',
	}
});
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







