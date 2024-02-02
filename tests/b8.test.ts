import { B8 } from '../src/b8'
import { SQLiteStorage } from '../src/SQLiteStorage'

// Mock any necessary constants and methods that are used within processText

describe('B8 Classification Test', () => {
	test('Classify a sample text', async () => {
		const textToClassify = 'This is a sample text to classify.'
		const b8 = new B8()
		const classificationResult = await b8.classify(textToClassify)
		console.log('Classification result:', classificationResult)
	})
})

describe('B8', () => {
	let b8: B8

	beforeEach(() => {
		b8 = new B8({
			storage: {
				dbPath: ':memory:',
			},
		})
	})

	describe('processText', () => {
		it('should process text for learning correctly', async () => {
			// Arrange
			const text = 'Hello, world!'
			const category = 'probable' // Replace with appropriate category
			const action = 'learn'

			// Act
			const result = await b8.processText(text, category, action)

			// Assert
			expect(result).toBe(true)
		})

		it('should process text for unlearning correctly', async () => {
			// Arrange
			const text = 'Hello, world!'
			const category = 'probable'
			const action = 'unlearn'

			// Act
			const result = await b8.processText(text, category, action)

			// Assert
			expect(result).toBe(true)
		})

		it('should throw an error if action is null', async () => {
			// Arrange
			const text = ''
			const category = 'improbable'
			const action = undefined

			// Act
			const result = b8.processText(text, category, action as undefined)

			// Assert
			await expect(result).rejects.toThrowError()
		})
	})
})
