import { B8 } from '../src/b8'

describe('B8 Classification Test', () => {
	test('Classify a sample text', async () => {
		const textToClassify = 'This is a sample text to classify.'
		const b8 = new B8()
		const classificationResult = await b8.classify(textToClassify)
		console.log('Classification result:', classificationResult)
	})
})
