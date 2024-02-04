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

		const textToClassify = 'This is a sample text to classify.'
		await b8.learn(textToClassify, 'probable')
		const classificationResult = await b8.classify(textToClassify)
		expect(classificationResult).toBeGreaterThanOrEqual(0.5)
	})
})
