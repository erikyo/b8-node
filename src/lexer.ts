import { convert } from 'html-to-text'
import { LEXER_TEXT_EMPTY } from './const.js'
import { B8CONFIG, LEXER_TOKEN } from './types.js'

export class Lexer {
	tokens: LEXER_TOKEN | null = {}
	private config: B8CONFIG['lexer']
	private processedText: string | null

	constructor(config: B8CONFIG['lexer']) {
		this.config = config

		this.tokens = null
		this.processedText = null
	}

	countWordOccurrences(wordsArray: string[]): LEXER_TOKEN {
		const wordCount: LEXER_TOKEN = {}
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
	getTokens(text: string): LEXER_TOKEN {
		// Convert HTML to plain text
		text = convert(text)

		if (text.trim() === '') {
			console.error(LEXER_TEXT_EMPTY)
			return {} as LEXER_TOKEN
		}

		// TODO: add a Tokenization logic...
		const tokens = text.split(/\s+/)

		this.tokens = this.countWordOccurrences(tokens)
		this.processedText = text

		return this.tokens
	}
}
