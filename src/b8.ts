import { Degenerator } from './degenerator'
import { Lexer } from './lexer'
import { SQLiteStorage } from './SQLiteStorage'
import {
	CLASSIFIER_TEXT_MISSING,
	TRAINER_CATEGORY_MISSING,
	TRAINER_TEXT_MISSING,
} from './const'
import { B8CONFIG, DATASET } from './types'

const configDefaults: B8CONFIG = {
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

function validateConfig(config: B8CONFIG) {
	let validConfig: B8CONFIG = configDefaults
	// Validate config data
	Object.keys(config).forEach((name) => {
		switch (name) {
			case 'min_dev':
				validConfig[name] = config[name] || 0.01
				break
			case 'rob_s':
			case 'rob_x':
				validConfig[name] = config[name] || 0.05
				break
			case 'use_relevant':
				validConfig[name] = config[name] || 0.95
				break
			case 'lexer':
			case 'degenerator':
			case 'storage':
				validConfig[name] = config[name]
				break
			case 'dbPath':
				validConfig[name] = config[name]
				break
			default:
				throw new Error(`Unknown configuration key: "${name}"`)
		}
	})
	return validConfig
}

export class B8 {
	config: B8CONFIG

	private degenerator: Degenerator
	private lexer: Lexer
	private storage: SQLiteStorage
	private version: number
	private context: string = ''
	private internals: DATASET

	constructor(config: B8CONFIG = {}) {
		this.config = validateConfig(config)

		// The degenerator class
		this.degenerator = new Degenerator(this.config.degenerator)

		// The lexer class
		this.lexer = new Lexer(this.config.lexer)

		// The storage backend with SQLite
		this.storage = new SQLiteStorage(this.config.storage) as SQLiteStorage

		// Get the internal database variables
		this.version = this.storage.getVersion()

		// Set up the internal database variables
		this.internals = this.storage.getInternals(this.context) as DATASET
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

				const [hamCount, spamCount] = this.storage.getToken(tokenData)

				tokenSpamValues[token] = this.calculateTokenAffinity(spamCount, hamCount)
			}
		}

		// Calculate the spaminess of the text
		return this.calculateTextAffinity(tokenSpamValues)
	}

	/**
	 * Calculates the spamminess of a token based on spam and ham counts.
	 *
	 * @param {number} neg - the count of the token in spam messages
	 * @param {number} pos - the count of the token in non-spam messages
	 * @return {number} the spamminess of the token
	 */
	calculateTokenAffinity(neg: number, pos: number) {
		//const totalTokens = negativeCount + positiveCount
		const totalCategories =
			this.internals.negativeCount + this.internals.positiveCount

		const spamProbability =
			(neg + 1) / (this.internals.negativeCount + totalCategories)
		const hamProbability =
			(pos + 1) / (this.internals.positiveCount + totalCategories)

		return spamProbability / (spamProbability + hamProbability)
	}

	/**
	 * Calculates the spaminess of a text based on token spam values and internals.
	 *
	 * @param {object} tokenSpamValues - An object containing token spam values.
	 * @return {number} The spaminess of the text.
	 */
	calculateTextAffinity(tokenSpamValues: Record<string, number>) {
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

	learn(text: null | string, type: 'probable' | 'improbable') {
		// Let's first see if the user called the function correctly
		if (text === null) {
			return TRAINER_TEXT_MISSING
		}

		return this.processText(text, type)
	}

	unlearn(text: null | string, type: 'probable' | 'improbable' | null) {
		// Let's first see if the user called the function correctly
		if (text === null) {
			return TRAINER_TEXT_MISSING
		}
		if (type === null || !this.checkType(type)) {
			return TRAINER_CATEGORY_MISSING
		}

		return this.processText(text, type)
	}

	async processText(text: string, context: string | undefined = undefined) {
		// Tokenize the text
		const tokens = this.lexer.getTokens(text)

		// Degenerate the tokens
		this.degenerator.degenerate(tokens)

		// Retrieve or create the current context in the storage
		if (context !== this.context) {
			this.updateContext(context)
		}
	}

	async evaluate(
		type: 'probable' | 'improbable' | null,
		action: 'learn' | 'unlearn' = 'learn'
	) {
		let positiveCount = 0,
			negativeCount = 0
		for (const tokens in this.degenerator.degenerates) {
			// Increase or decrease the right counter
			if (action === 'learn') {
				if (type === 'probable') {
					positiveCount += tokens.length
				} else if (type === 'improbable') {
					negativeCount += tokens.length
				}
			} else if (action == 'unlearn') {
				if (type === 'probable') {
					positiveCount -= tokens.length
				} else if (type === 'improbable') {
					negativeCount -= tokens.length
				}
			}
		}

		// Update the token database based on the action (learn or unlearn)
		if (action === 'learn') {
			this.storage.addTokens(
				this.degenerator.flattenDegenerates(this.degenerator.degenerates),
				{
					count_probable: positiveCount,
					count_improbable: negativeCount,
				}
			)
		} else if (action === 'unlearn') {
			this.storage.deleteToken(
				this.degenerator.flattenDegenerates(this.degenerator.degenerates)
			)
		}

		// Update the internals
		if (action === 'learn') {
			this.internals.totalLearned++
		} else if (action === 'unlearn') {
			this.internals.totalUnlearned++
		}

		// Update the context counters
		if (type === 'probable') {
			this.internals.positiveCount += action === 'learn' ? 1 : -1
		} else if (type === 'improbable') {
			this.internals.negativeCount += action === 'learn' ? 1 : -1
		}

		return true
	}

	checkType(type: string) {
		return type === 'probable' || type === 'improbable'
	}

	private updateContext(context?: string) {
		if (context && !this.storage.tableExists(context)) {
			this.storage.createTable(context)
		}
		this.internals = this.storage.getInternals(context)
	}
}
