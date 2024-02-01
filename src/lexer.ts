import { convert } from 'html-to-text'
import { LEXER_TEXT_EMPTY, LEXER_TEXT_NOT_STRING } from './const'

export class Lexer {
	tokens: string[] | null
	private config: {}
	private processedText: string | null

	constructor(config = {}) {
		this.config = config

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

		// Convert HTML to plain text
		text = convert(text)

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
