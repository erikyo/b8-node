import { Lexer } from '../src/lexer'
import { configDefaults } from '../src/const'

describe('@lexer method', () => {
	let lexer: Lexer

	beforeEach(() => {
		lexer = new Lexer(configDefaults.lexer)
	})

	it('should correctly tokenize input', () => {
		const input = 'your input here'
		const expectedOutput = {
			here: 1,
			input: 1,
			your: 1,
		}
		const result = lexer.getTokens(input)
		expect(result).toEqual(expectedOutput)
	})
})
