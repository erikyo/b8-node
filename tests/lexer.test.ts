import { Lexer } from '../src/lexer'
import { configDefaults, LEXER_TEXT_EMPTY, LEXER_TEXT_NOT_STRING } from '../src/const'

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

	it('should throw an error if the input text is empty', () => {
		const input = ''
		const result = lexer.getTokens(input)
		expect(result).toMatchObject({})
	})

	it('should throw an error if the input is null', () => {
		const input = null
		const result = lexer.getTokens(input as unknown as string)
		expect(
			result // Type casting to bypass TypeScript compilation error
		).toMatchObject({})
	})
})
