import { describe, it } from '@jest/globals'
import { B8 } from '../src'

// Mock any necessary constants and methods that are used within processText
describe('B8', () => {
	it('should process text for learning correctly', async () => {
		// Create an instance of B8
		const b8 = new B8()

		// Learn some text
		await b8.learn('Hello, world!', 'probable')
		await b8.unlearn('world asd', 'probable')

		const good = 'Hey world! This is a sample text to classify.'
		const bad = 'remove this words from your text'
		const textToClassify =
			'This is a sample that contains words to classify eg. world'
		await b8.learn(good, 'probable')
		await b8.learn(bad, 'improbable')
		const classificationResult = await b8.classify(textToClassify)
		expect(classificationResult).toBeGreaterThanOrEqual(0.5)
	})
})
