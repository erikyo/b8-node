import { Lexer } from '../src/lexer'
import { LEXER_TEXT_EMPTY, LEXER_TEXT_NOT_STRING } from '../src/const'

describe('@lexer method', () => {
	let lexer: Lexer

	beforeEach(() => {
		lexer = new Lexer()
	})

	it('should correctly tokenize input', () => {
		const input = 'your input here'
		const expectedOutput = ['your', 'input', 'here']
		const result = lexer.getTokens(input)
		expect(result).toEqual(expectedOutput)
	})

	it('should throw an error if the input text is empty', () => {
		const input = ''
		expect(() => {
			lexer.getTokens(input)
		}).toThrow(LEXER_TEXT_EMPTY)
	})

	it('should throw an error if the input is null', () => {
		const input = null
		expect(() => {
			lexer.getTokens(input as any) // Type casting to bypass TypeScript compilation error
		}).toThrow(LEXER_TEXT_NOT_STRING)
	})
})
