import { Degenerator } from './degenerator'
import { Lexer } from './lexer'
import { SQLiteStorage } from './SQLiteStorage'
import {
	CLASSIFIER_TEXT_MISSING,
	HAM,
	LEARN,
	SPAM,
	TRAINER_CATEGORY_MISSING,
	TRAINER_TEXT_MISSING,
	UNLEARN,
} from './const'
import { B8CONFIG, DATABASE_INTERNAL } from './types'

export class B8 {
	config = {
		min_dev: 0.01,
		rob_s: 0.5,
		rob_x: 0.5,
		use_relevant: 0.95,
		lexer: {},
		degenerator: {},
		storage: {},
		dbPath: ':memory:',
	}
	private degenerator: Degenerator
	private lexer: Lexer
	private storage: SQLiteStorage
	private DBVERSION = 3

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
					this.config[name] = config[name] || {}
					break
				case 'dbPath':
					this.config[name] = config[name] || ':memory:'
					break
				default:
					throw new Error(`Unknown configuration key: "${name}"`)
			}
		})

		// The degenerator class
		this.degenerator = new Degenerator(config)

		// The lexer class
		this.lexer = new Lexer(config)

		// The storage backend with SQLite
		this.storage = new SQLiteStorage(config)
	}

	async classify(text: string) {
		// Let's first see if the user called the function correctly
		if (text === null) {
			return CLASSIFIER_TEXT_MISSING
		}

		// Tokenize the text
		const tokens = this.lexer.getTokens(text)

		// Degenerate the tokens
		const degeneratedTokens = this.degenerator.degenerate(tokens)

		// Get the internal database variables
		const internals = (await this.storage.getInternals()) as DATABASE_INTERNAL

		// Calculate the spaminess of all tokens
		const tokenSpamValues: Record<string, number> = {}
		for (const token in degeneratedTokens) {
			if (token in degeneratedTokens) {
				const tokenData =
					degeneratedTokens[token as keyof typeof degeneratedTokens]

				const spamCount = await this.storage.getTokenCount(tokenData, SPAM)
				const hamCount = await this.storage.getTokenCount(tokenData, HAM)

				tokenSpamValues[token] = this.calculateTokenSpaminess(
					spamCount,
					hamCount,
					internals
				)
			}
		}

		// Calculate the spaminess of the text
		return this.calculateTextSpaminess(tokenSpamValues, internals)
	}

	/**
	 * Calculates the spamminess of a token based on spam and ham counts.
	 *
	 * @param {number} spamCount - the count of the token in spam messages
	 * @param {number} hamCount - the count of the token in non-spam messages
	 * @param {Object} internals - object containing spam and ham counts for all tokens
	 * @return {number} the spamminess of the token
	 */
	calculateTokenSpaminess(
		spamCount: number,
		hamCount: number,
		internals: DATABASE_INTERNAL
	) {
		//const totalTokens = spamCount + hamCount
		const totalCategories = internals.spamCount + internals.hamCount

		const spamProbability = (spamCount + 1) / (internals.spamCount + totalCategories)
		const hamProbability = (hamCount + 1) / (internals.hamCount + totalCategories)

		return spamProbability / (spamProbability + hamProbability)
	}

	/**
	 * Calculates the spaminess of a text based on token spam values and internals.
	 *
	 * @param {object} tokenSpamValues - An object containing token spam values.
	 * @param {object} internals - An object containing internal values.
	 * @return {number} The spaminess of the text.
	 */
	calculateTextSpaminess(
		tokenSpamValues: Record<string, number>,
		internals: DATABASE_INTERNAL
	) {
		let textSpaminess = 1.0 // Initialize with neutral probability

		for (const token in tokenSpamValues) {
			if (tokenSpamValues[token]) {
				const tokenSpaminess = tokenSpamValues[token]
				textSpaminess *= tokenSpaminess
			}
		}

		// Apply Bayesian probability
		const priorSpamProbability =
			internals.spamCount / (internals.spamCount + internals.hamCount)
		const priorHamProbability =
			internals.hamCount / (internals.spamCount + internals.hamCount)

		textSpaminess *= priorSpamProbability
		textSpaminess /= textSpaminess + priorHamProbability

		return textSpaminess
	}

	learn(text: null | string, category: null | string) {
		// Let's first see if the user called the function correctly
		if (text === null) {
			return TRAINER_TEXT_MISSING
		}
		if (category === null || !this.checkCategory(category)) {
			return TRAINER_CATEGORY_MISSING
		}

		return this.processText(text, category, LEARN)
	}

	unlearn(text: null | string, category: null | string) {
		// Let's first see if the user called the function correctly
		if (text === null) {
			return TRAINER_TEXT_MISSING
		}
		if (category === null || !this.checkCategory(category)) {
			return TRAINER_CATEGORY_MISSING
		}

		return this.processText(text, category, UNLEARN)
	}

	async processText(text: string, category: string, action: string) {
		// Retrieve the storage
		const storage = this.storage

		// Get the internal database variables
		const internals = (await storage.getInternals()) as DATABASE_INTERNAL

		// Tokenize the text
		const tokens = this.lexer.getTokens(text)

		// Degenerate the tokens
		const degeneratedTokens = this.degenerator.degenerate(tokens)

		// Retrieve or create the current category in the storage
		let currentCategory = storage.getCategory(category)
		if (!currentCategory) {
			currentCategory = await storage.createCategory(category)
		}

		// Update the token database based on the action (learn or unlearn)
		if (action === LEARN) {
			storage.learn(degeneratedTokens, currentCategory)
		} else if (action === UNLEARN) {
			storage.unlearn(degeneratedTokens, currentCategory)
		}

		// Update the internals
		if (action === LEARN) {
			internals.totalLearned++
		} else if (action === UNLEARN) {
			internals.totalUnlearned++
		}

		// Update the category counters
		if (currentCategory === HAM) {
			internals.hamCount += action === LEARN ? 1 : -1
		} else if (currentCategory === SPAM) {
			internals.spamCount += action === LEARN ? 1 : -1
		}

		// Persist the changes
		// storage.save();

		return true
	}

	checkCategory(category: string) {
		return category === HAM || category === SPAM
	}
}
