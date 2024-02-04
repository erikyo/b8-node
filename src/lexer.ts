import { convert } from 'html-to-text'
import { LEXER_TEXT_EMPTY, LEXER_TEXT_NOT_STRING } from './const'
import { B8CONFIG, TOKENS } from './types'

export class Lexer {
	tokens: TOKENS | null = {}
	private config: B8CONFIG['lexer']
	private processedText: string | null

	constructor(config: B8CONFIG['lexer']) {
		this.config = config

		this.tokens = null
		this.processedText = null
	}

	countWordOccurrences(wordsArray: string[]): TOKENS {
		const wordCount: TOKENS = {}
		wordsArray.forEach((word) => {
			if (wordCount[word]) {
				wordCount[word] += 1
			} else {
				wordCount[word] = 1
			}
		})
		return wordCount
	}

	/**
	 * Tokenizes the input text and sets the tokens and processedText properties.
	 *
	 * @param {string} text - the input text to tokenize
	 * @return {string[]} the array of tokens generated from the input text
	 */
	getTokens(text: string | null): TOKENS {
		if (typeof text !== 'string') {
			console.error(LEXER_TEXT_NOT_STRING)
		}

		// Convert HTML to plain text
		text = convert(text)

		if (text.trim() === '') {
			console.error(LEXER_TEXT_EMPTY)
		}

		// Tokenization logic...
		const tokens = text.split(/\s+/)

		this.tokens = this.countWordOccurrences(tokens)
		this.processedText = text

		return this.tokens
	}
}
