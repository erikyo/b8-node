import { Degenerator } from './degenerator'
import { Lexer } from './lexer'
import { SQLiteStorage } from './SQLiteStorage'
import {
	CLASSIFIER_TEXT_MISSING,
	TRAINER_CATEGORY_MISSING,
	TRAINER_TEXT_MISSING,
} from './const'
import { B8CONFIG } from './types'

export class B8 {
	config: B8CONFIG = {
		min_dev: 0.01,
		rob_s: 0.5,
		rob_x: 0.5,
		use_relevant: 0.95,
		lexer: {
			min_size: 3,
			max_size: 30,
			get_uris: true,
			get_html: true,
			get_bbcode: false,
			allow_numbers: false,
		},
		degenerator: {
			multibyte: true,
			encoding: 'UTF-8',
		},
		storage: {
			dbPath: ':memory:',
		},
	}

	private degenerator: Degenerator
	private lexer: Lexer
	private storage: SQLiteStorage
	private version: number
	private internals: {
		positiveCount: number
		negativeCount: number
		totalLearned: number
		totalUnlearned: number
	}

	constructor(config: B8CONFIG = {}) {
		// Validate config data
		Object.keys(config).forEach((name) => {
			switch (name) {
				case 'min_dev':
					this.config[name] = config[name] || 0.01
					break
				case 'rob_s':
				case 'rob_x':
					this.config[name] = config[name] || 0.05
					break
				case 'use_relevant':
					this.config[name] = config[name] || 0.95
					break
				case 'lexer':
				case 'degenerator':
				case 'storage':
					this.config[name] = config[name]
					break
				case 'dbPath':
					this.config[name] = config[name]
					break
				default:
					throw new Error(`Unknown configuration key: "${name}"`)
			}
		})

		// The degenerator class
		this.degenerator = new Degenerator(this.config.degenerator)

		// The lexer class
		this.lexer = new Lexer(this.config.lexer)

		// The storage backend with SQLite
		this.storage = new SQLiteStorage(this.config.storage) as SQLiteStorage

		// Get the internal database variables
		this.version = this.storage.getVersion()
		this.internals = {
			totalLearned: 0,
			totalUnlearned: 0,
			...this.storage.getInternals(),
		}
	}

	async classify(text: string) {
		// Let's first see if the user called the function correctly
		if (text === null) {
			return CLASSIFIER_TEXT_MISSING
		}

		// Tokenize the text
		const tokens = this.lexer.getTokens(text)

		// Degenerate the tokens
		this.degenerator.degenerate(tokens)

		// Calculate the affinities of all tokens
		const tokenSpamValues: Record<string, number> = {}
		for (const token in this.degenerator.degenerates) {
			if (token in this.degenerator.degenerates) {
				const tokenData = this.degenerator.degenerates[token]

				const spamCount = await this.storage.getTokenCount(
					tokenData,
					'improbable'
				)
				const hamCount = await this.storage.getTokenCount(tokenData, 'probable')

				tokenSpamValues[token] = this.calculateTokenSpaminess(spamCount, hamCount)
			}
		}

		// Calculate the spaminess of the text
		return this.calculateTextSpaminess(tokenSpamValues)
	}

	/**
	 * Calculates the spamminess of a token based on spam and ham counts.
	 *
	 * @param {number} spamCount - the count of the token in spam messages
	 * @param {number} hamCount - the count of the token in non-spam messages
	 * @return {number} the spamminess of the token
	 */
	calculateTokenSpaminess(spamCount: number, hamCount: number) {
		//const totalTokens = negativeCount + positiveCount
		const totalCategories =
			this.internals.negativeCount + this.internals.positiveCount

		const spamProbability =
			(spamCount + 1) / (this.internals.negativeCount + totalCategories)
		const hamProbability =
			(hamCount + 1) / (this.internals.positiveCount + totalCategories)

		return spamProbability / (spamProbability + hamProbability)
	}

	/**
	 * Calculates the spaminess of a text based on token spam values and internals.
	 *
	 * @param {object} tokenSpamValues - An object containing token spam values.
	 * @return {number} The spaminess of the text.
	 */
	calculateTextSpaminess(tokenSpamValues: Record<string, number>) {
		let textSpaminess = 1.0 // Initialize with neutral probability

		for (const token in tokenSpamValues) {
			if (tokenSpamValues[token]) {
				const tokenSpaminess = tokenSpamValues[token]
				textSpaminess *= tokenSpaminess
			}
		}

		// Apply Bayesian probability
		const priorSpamProbability =
			this.internals.negativeCount /
			(this.internals.negativeCount + this.internals.positiveCount)
		const priorHamProbability =
			this.internals.positiveCount /
			(this.internals.negativeCount + this.internals.positiveCount)

		textSpaminess *= priorSpamProbability
		textSpaminess /= textSpaminess + priorHamProbability

		return textSpaminess
	}

	learn(text: null | string, context: 'probable' | 'improbable' | null) {
		// Let's first see if the user called the function correctly
		if (text === null) {
			return TRAINER_TEXT_MISSING
		}
		if (context === null || !this.checkCategory(context)) {
			return TRAINER_CATEGORY_MISSING
		}

		return this.processText(text, context, 'learn')
	}

	unlearn(text: null | string, context: 'probable' | 'improbable' | null) {
		// Let's first see if the user called the function correctly
		if (text === null) {
			return TRAINER_TEXT_MISSING
		}
		if (context === null || !this.checkCategory(context)) {
			return TRAINER_CATEGORY_MISSING
		}

		return this.processText(text, context, 'unlearn')
	}

	async processText(
		text: string,
		context: 'probable' | 'improbable' | null,
		action: 'learn' | 'unlearn' = 'learn'
	) {
		// Retrieve the storage
		const storage = this.storage

		// Tokenize the text
		const tokens = this.lexer.getTokens(text)

		// Degenerate the tokens
		this.degenerator.degenerate(tokens)

		// Retrieve or create the current context in the storage
		/*		let currentCategory = storage.getCategory(context)
		if (!currentCategory) {
			currentCategory = await storage.createCategory(context)
		}*/

		for (const token in tokens) {
			// Increase or decrease the right counter
			if (action === 'learn') {
				if (context === 'probable') {
					this.internals.positiveCount += token.length
				} else if (context === 'improbable') {
					this.internals.negativeCount += token.length
				}
			} else if (action == 'unlearn') {
				if (context === 'probable') {
					this.internals.positiveCount -= token.length
				} else if (context === 'improbable') {
					this.internals.negativeCount -= token.length
				}
			}
		}

		// Update the token database based on the action (learn or unlearn)
		if (action === 'learn') {
			storage.learn(this.degenerator.degenerates, context)
		} else if (action === 'unlearn') {
			storage.unlearn(this.degenerator.degenerates, context)
		}

		// Update the internals
		if (action === 'learn') {
			this.internals.totalLearned++
		} else if (action === 'unlearn') {
			this.internals.totalUnlearned++
		}

		// Update the context counters
		if (context === 'probable') {
			this.internals.positiveCount += action === 'learn' ? 1 : -1
		} else if (context === 'improbable') {
			this.internals.negativeCount += action === 'learn' ? 1 : -1
		}

		return true
	}

	checkCategory(context: string) {
		return context === 'probable' || context === 'improbable'
	}
}
