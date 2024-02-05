import { describe, it } from '@jest/globals'
import { B8 } from '../src'
import { TOKEN_VALUE } from '../src/types'

// Mock any necessary constants and methods that are used within processText
describe('B8', () => {
	it('should process text for learning correctly', async () => {
		// Create an instance of B8
		const b8 = new B8()

		// Learn some text
		await b8.learn('Hello, world!', 'probable')
		await b8.unlearn('hello asd', 'probable')

		await b8.learn(
			'Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.',
			'probable'
		)
		await b8.learn(
			'Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.',
			'probable'
		)
		await b8.learn(
			'Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.',
			'probable'
		)
		await b8.learn(
			'Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.',
			'probable'
		)
		await b8.learn(
			'Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.Hey world! This is a sample text to classify.',
			'probable'
		)
		await b8.learn(
			'remove this words from your text of words to classify for example words to remove',
			'improbable'
		)
		const classificationResult = await b8.classify(
			'a sample text that contains words to classify eg. world'
		)
		expect(classificationResult).toBeGreaterThanOrEqual(0.5)
	})
})

describe('calculateAffinity', () => {
	// Mock the token object for testing
	const mockToken: TOKEN_VALUE = {
		neg: 5,
		pos: 10,
	}

	it('should calculate the affinity correctly', () => {
		// Create an instance of your class
		const instance = new B8()

		// Set up internal counts for testing
		instance.internals = {
			negativeCount: 20,
			positiveCount: 30,
		}

		const affinity = instance.calculateAffinity(mockToken)

		// Call the method and expect the result to match the expected value
		expect(affinity).toBeCloseTo(0.429, 2) // Using toBeCloseTo for comparing floating point numbers
	})

	it('should handle zero counts correctly', () => {
		// Create an instance of your class
		const instance = new B8()

		// Set up internal counts for testing
		instance.internals = {
			negativeCount: 0,
			positiveCount: 50,
		}

		const affinity = instance.calculateAffinity(mockToken)

		// Call the method and expect it to handle zero counts gracefully
		expect(affinity).toBeCloseTo(0.95, 2) // Adjust this expectation based on your logic for zero counts
	})
})
