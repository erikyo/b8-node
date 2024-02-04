import { Degenerator } from './degenerator'
import { Lexer } from './lexer'
import { SQLiteStorage } from './SQLiteStorage'
import { configDefaults, INTERNALS } from './const'
import { B8CONFIG, DATASET, LEXER_TOKEN, TOKEN, TOKEN_VALUE, TOKENDATA } from './types'

function validateConfig(config: B8CONFIG) {
	const validConfig: B8CONFIG = configDefaults
	// Validate config data
	Object.keys(config).forEach((name) => {
		switch (name) {
			case 'min_dev':
				validConfig[name] = config[name]
				break
			case 'rob_s':
			case 'rob_x':
				validConfig[name] = config[name]
				break
			case 'use_relevant':
				validConfig[name] = config[name]
				break
			case 'lexer':
			case 'degenerator':
				validConfig[name] = config[name]
				break
			case 'storage':
				validConfig['storage'] = config['storage']
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
	private context: string = ''
	private internals: DATASET
	private tokenData: TOKENDATA | null = null

	constructor(config: B8CONFIG) {
		this.config = validateConfig(config)

		// The degenerator class
		this.degenerator = new Degenerator(this.config.degenerator)

		// The lexer class
		this.lexer = new Lexer(this.config.lexer)

		// The storage backend with SQLite
		this.storage = new SQLiteStorage(this.config.storage) as SQLiteStorage

		this.internals = {
			positiveCount: 0,
			negativeCount: 0,
			totalLearned: 0,
			totalUnlearned: 0,
		}
	}

	async get(tokens: string[]): Promise<TOKENDATA> {
		const tokenData = await this.storage.getTokens(tokens)

		// Check if we have to degenerate some tokens
		const missingTokens: string[] = Object.keys(tokens).filter(
			(token) => !(token in tokenData)
		)

		let degenerates_list = {}

		if (missingTokens.length > 0) {
			// Generate a list of degenerated tokens for the missing tokens ...
			const missingTokenData: Record<string, string[]> =
				this.degenerator.degenerate(missingTokens)

			// ... and add them to the token data
			Object.entries(missingTokenData).forEach(([token, degenerated]) => {
				degenerates_list = { ...degenerates_list, [token]: degenerated }
			})
		}

		const return_data_tokens: TOKENDATA['tokens'] = {}
		const return_data_degenerates: TOKENDATA['degenerates'] = {}

		for (const token of tokens) {
			if (tokenData[token]) {
				// The token was found in the database
				return_data_tokens[token] = tokenData[token]
			} else {
				/** The token was not found, so we look if we can return data for degenerated tokens */
				for (const degenerate of this.degenerator.degenerates[token]) {
					if (tokenData[degenerate]) {
						// A degenerated version of the token was found in the database
						if (!return_data_degenerates[token]) {
							return_data_degenerates[token] = {}
						}
						return_data_degenerates[token][degenerate] = tokenData[degenerate]
					}
				}
			}
		}

		// Now, all token data directly found in the database is in return_data_tokens
		// and all data for degenerated versions is in return_data_degenerates
		return {
			tokens: return_data_tokens,
			degenerates: return_data_degenerates,
		}
	}

	async classify(text: string, context: string = 'b8_dataset') {
		// update the context
		await this.updateContext(context)

		// Tokenize the text
		const tokens = this.lexer.getTokens(text)

		this.tokenData = await this.get(Object.keys(tokens))

		const stats: {
			wordCount: Record<string, number>
			rating: Record<string, number>
			importance: Record<string, number>
		} = {
			wordCount: {},
			rating: {},
			importance: {},
		}

		Object.entries(tokens).forEach(([token, count]) => {
			stats.wordCount[token] = count
			// Although we only call this function only here ... let's do the calculation stuff in a
			// function to make this a bit less confusing ;-)
			stats.rating[token] = this.getProbability(token, this.tokenData)
			stats.importance[token] = Math.abs(0.5 - stats.rating[token])
		})

		const relevantTokens = []
		for (let i = 0; i < this.config.use_relevant; i++) {
			const token = Object.keys(stats.importance)[0]

			// Important tokens remain
			if (token) {
				// If the token's rating is relevant enough, use it
				if (Math.abs(0.5 - stats.rating[token]) > this.config.min_dev) {
					// Tokens that appear more than once also count more than once
					for (let x = 0, l = stats.wordCount[token]; x < l; x++) {
						relevantTokens.push(stats.rating[token])
					}
				}
			} else {
				// We have fewer words than we want to use, so we already use what we have and can break here
				break
			}

			// Move to the next key in the importance object
			delete stats.importance[token]
		}
	}

	/**
	 * Calculate the spaminess of a single token also considering "degenerated" versions
	 *
	 * @private
	 * @param {string} word - The word to rate
	 * @param tokenData - The token dataset
	 * @returns {number} - The word's rating
	 */
	getProbability(word: string, tokenData: TOKENDATA) {
		// Let's see what we have!
		if (tokenData.degenerates[word]) {
			// The token is in the database, so we can use its data as-is and calculate the spaminess of this token directly
			return this.calculateAffinity(tokenData.tokens[word])
		}

		// The token was not found, so do we at least have similar words?
		if (tokenData.degenerates[word]) {
			// We found similar words, so calculate the spaminess for each one and choose the most
			// important one for further calculation

			// The default rating is 0.5 simply saying nothing
			let rating = 0.5

			Object.entries(tokenData.degenerates[word]).forEach(([, token]) => {
				// Calculate the rating of the current degenerated token
				const ratingTmp = this.calculateAffinity(token as TOKEN)

				// Is it more important than the rating of another degenerated version?
				if (Math.abs(0.5 - ratingTmp) > Math.abs(0.5 - rating)) {
					rating = ratingTmp
				}
			})

			return rating
		} else {
			// The token is really unknown, so choose the default rating for completely unknown
			// tokens.
			// This strips down to the robX parameter, so we can cheap out the freaky math
			// ;-)
			return this.config.rob_x
		}
	}

	/**
	 * Calculates the spamminess of a token based on spam and ham counts.
	 *
	 * @param token - The token to calculate
	 *
	 * @return {number} the spamminess of the token
	 */
	calculateAffinity(token: TOKEN_VALUE) {
		//const totalTokens = negativeCount + positiveCount
		const totalCategories =
			this.internals.negativeCount + this.internals.positiveCount

		const negProbability =
			(token.neg + 1) / (this.internals.negativeCount + totalCategories)
		const posProbability =
			(token.pos + 1) / (this.internals.positiveCount + totalCategories)

		return negProbability / (negProbability + posProbability)
	}

	async processText(
		text: string,
		type: 'probable' | 'improbable' = 'probable',
		action: 'learn' | 'unlearn' = 'learn',
		context: string | undefined = 'b8_dataset'
	) {
		// Retrieve or create the current context in the storage
		if (context !== this.context) {
			await this.updateContext(context)
		}
		// Tokenize the text
		const tokens: LEXER_TOKEN = this.lexer.getTokens(text)

		const tokenData = await this.storage.getTokens(Object.keys(tokens))

		// Process each token
		for (const [token, count] of Object.entries(tokens)) {
			// Check if we have to degenerate this token
			if (token in tokenData) {
				/** We already have this token, so update its data */
				const currentToken = tokenData[token]

				/** Increase or decrease the counter */
				if (action === 'learn') {
					if (type === 'probable') {
						currentToken.pos += count
					} else if (type === 'improbable') {
						currentToken.neg += count
					}
				} else if (action == 'unlearn') {
					if (type === 'probable') {
						currentToken.pos -= count
					} else if (type === 'improbable') {
						currentToken.neg -= count
					}
				}

				/** Update the stored dataset */
				if (currentToken.pos != 0 || currentToken.neg !== 0) {
					await this.storage.updateToken(
						token,
						[Math.abs(currentToken.pos), Math.abs(currentToken.neg)],
						this.context
					)
				} else {
					await this.storage.deleteToken(token, this.context)
				}
			} else {
				const currentToken = { pos: 0, neg: 0 }
				// We don't have the token.
				// If we unlearn a text, we can't delete it as we don't
				// have it anyway, so do something if we learn a text
				if (action === 'learn') {
					if (type === 'probable') {
						await this.storage.addToken(
							token,
							[currentToken.pos, 0],
							this.context
						)
					} else if (type === 'improbable') {
						await this.storage.addToken(
							token,
							[0, currentToken.neg],
							this.context
						)
					}
				}
			}
		}

		// Now, all tokens have been processed, so let's update the right text
		if (action === 'learn') {
			if (type === 'probable') {
				this.internals.positiveCount++
			} else if (type === 'improbable') {
				this.internals.negativeCount++
			}
		} else if (action === 'unlearn') {
			if (type === 'probable') {
				if (this.internals.positiveCount > 0) {
					this.internals.positiveCount--
				}
			} else if (type === 'improbable') {
				if (this.internals.negativeCount > 0) {
					this.internals.negativeCount--
				}
			}
		}

		await this.storage.updateToken(
			INTERNALS,
			[this.internals.positiveCount, this.internals.negativeCount],
			this.context
		)
	}

	async learn(text: string, type: 'probable' | 'improbable', context: string) {
		await this.processText(text, type, 'learn', context)
	}
	async unlearn(text: string, type: 'probable' | 'improbable', context: string) {
		await this.processText(text, type, 'unlearn', context)
	}

	private async updateContext(context: string = 'b8_dataset') {
		this.context = context
		// Create the context if it doesn't exist
		if (!this.storage.tableExists(this.context)) {
			this.storage.createContext(this.context)
		}

		// Update the internals
		const newInternals = await this.storage.getInternals(context)
		if (newInternals) {
			this.internals = newInternals
		} else {
			this.internals = {
				positiveCount: 0,
				negativeCount: 0,
				totalLearned: 0,
				totalUnlearned: 0,
			}
		}
	}
}
