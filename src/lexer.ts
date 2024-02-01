const LEXER_TEXT_NOT_STRING = 'LEXER_TEXT_NOT_STRING'
const LEXER_TEXT_EMPTY = 'LEXER_TEXT_EMPTY'

export class Lexer {
	tokens: string[] | null
	private config: {
		get_uris: boolean
		get_bbcode: boolean
		get_html: boolean
		allow_numbers: boolean
		min_size: number
		max_size: number
	}
	private processedText: string | null

	constructor(config = {}) {
		this.config = {
			...config,
		}

		this.tokens = null
		this.processedText = null
	}

	/**
	 * Tokenizes the input text and sets the tokens and processedText properties.
	 *
	 * @param {string} text - the input text to tokenize
	 * @return {string[]} the array of tokens generated from the input text
	 */
	getTokens(text: string | null) {
		if (typeof text !== 'string') {
			throw new Error(LEXER_TEXT_NOT_STRING)
		}

		if (text.trim() === '') {
			throw new Error(LEXER_TEXT_EMPTY)
		}

		// Tokenization logic...
		const tokens = text.split(/\s+/)

		this.tokens = tokens
		this.processedText = text

		return tokens
	}

	isValid(token: unknown) {
		return token && typeof token === 'string'
	}
}
