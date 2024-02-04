import { Degenerator } from '../src/degenerator'

describe('Degenerator class', () => {
	let degenerator: Degenerator

	beforeEach(() => {
		degenerator = new Degenerator()
	})

	it('deletes duplicates correctly', () => {
		const word = 'example'
		const list = ['example', 'sample', 'example']
		const expected = ['sample']
		expect(degenerator.deleteDuplicates(word, list)).toEqual(expected)
	})

	it('returns unique degenerates for a word', () => {
		const word = 'Example'
		const expected = ['example', 'EXAMPLE']
		const res = degenerator.degenerateWord(word)
		expect(res).toEqual(expected)
	})

	it('returns unique degenerates for a word', () => {
		const word = 'EXAmple'
		const expected = ['example', 'EXAMPLE', 'Example']
		const res = degenerator.degenerateWord(word)
		expect(res).toEqual(expected)
	})

	it('degenerates a list of words', () => {
		const words = ['Example', 'Test']
		degenerator.degenerate(words)
		expect(degenerator.degenerates).toEqual({
			Example: ['example', 'EXAMPLE'],
			Test: ['test', 'TEST'],
		})
	})

	// More test cases...
})
