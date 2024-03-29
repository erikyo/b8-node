import { Degenerator } from './degenerator'
import { Lexer } from './lexer'
import { SQLiteStorage } from './SQLiteStorage'
import { configDefaults, DEFAULT_DATASET, INTERNALS_KEY } from './const'
import { B8CONFIG, DATASET, LEXER_TOKEN, TOKEN_VALUE, TOKENDATA } from './types'

class B8 {
	config: B8CONFIG

	private degenerator: Degenerator
	private lexer: Lexer
	private storage: SQLiteStorage
	private context: string = DEFAULT_DATASET
	internals: DATASET
	private tokenData: TOKENDATA | null = null

	constructor(config?: B8CONFIG) {
		this.config = this.validateConfig(config)

		// The degenerator class
		this.degenerator = new Degenerator(this.config.degenerator)

		// The lexer class
		this.lexer = new Lexer(this.config.lexer)

		// The storage backend with SQLite
		this.storage = new SQLiteStorage(this.config.storage) as SQLiteStorage

		// Ensure the default internal stats are created
		this.internals = {
			positiveCount: 0,
			negativeCount: 0,
		}
	}

	private validateConfig(config?: Partial<B8CONFIG>) {
		if (!config) {
			return configDefaults
		}
		const validConfig: B8CONFIG = configDefaults
		// Validate config data
		Object.keys(config).forEach((name) => {
			switch (name) {
				case 'min_dev':
				case 'rob_s':
				case 'rob_x':
				case 'use_relevant':
					validConfig[name] = Number(config[name])
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

	private async get(tokens: string[]): Promise<TOKENDATA> {
		const tokenData = await this.storage.getTokens(tokens)

		// Check if we have to degenerate some tokens
		const missingTokens: string[] = tokens.filter((token) => !(token in tokenData))

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
		if (context !== this.context) {
			await this.updateContext(context)
		}

		// Tokenize the text
		const tokens = this.lexer.getTokens(text)

		this.tokenData = await this.get(Object.keys(tokens))

		const relevantScore = this.config.use_relevant || 15

		const stats: {
			wordCount: Record<string, number>
			rating: Record<string, number>
			importance: Record<string, number>
		} = {
			wordCount: {},
			rating: {},
			importance: {},
		}

		// Calculate the affinity of each token
		Object.entries(tokens).forEach(([token, count]) => {
			stats.wordCount[token] = count
			// Although we only call this function only here ... let's do the calculation stuff in a
			// function to make this a bit less confusing ;-)
			stats.rating[token] = this.tokenData?.tokens[token]
				? this.getProbability(token, this.tokenData)
				: 0.5
			stats.importance[token] = Math.abs(0.5 - stats.rating[token])
		})

		// sort stats.importance by value
		stats.importance = Object.fromEntries(
			Object.entries(stats.importance).sort((a, b) => b[1] - a[1])
		)

		const relevantTokens = []
		for (let i = 0; i < relevantScore; i++) {
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
			}
		}

		// We set both haminess and spaminess to 1 for the first multiplying
		let positive = 1
		let negative = 1

		// Consider all relevant ratings
		for (const value of relevantTokens) {
			positive *= 1.0 - value
			negative *= value
		}

		// Calculate the combined rating

		// Get the number of relevant ratings
		const n = relevantTokens.length

		// The actual haminess and spaminess
		positive = Math.pow(positive, 1 / n)
		negative = Math.pow(negative, 1 / n)

		// Calculate the combined indicator
		let probability = (positive - negative) / (positive + negative)

		// We want a value between 0 and 1, not between -1 and +1, so ...
		probability = (1 + probability) / 2

		// Alea iacta est
		return probability
	}

	/**
	 * Calculate the spaminess of a single token also considering "degenerated" versions
	 *
	 * @private
	 * @param {string} word - The word to rate
	 * @param tokenData - The token dataset
	 * @returns {number} - The word's rating
	 */
	private getProbability(word: string, tokenData: TOKENDATA): number {
		// Let's see what we have!
		if (tokenData.tokens[word]) {
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
				const ratingTmp = this.calculateAffinity(token)

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
			return this.config.rob_x || 0.5
		}
	}

	/**
	 * Calculates the affinity of a token based on positive and negative counts
	 *
	 * @param token - The token to calculate
	 *
	 * @return {number} the affinity of the token
	 */
	calculateAffinity(token: TOKEN_VALUE) {
		// const totalTokens = negativeCount + positiveCount
		// Calculate the basic probability as proposed by Mr. Graham

		// But: consider the number of positive and negative texts saved instead of the number of entries
		// where the token appeared to calculate a relative spaminess because we count tokens
		// appearing multiple times not just once but as often as they appear in the learned texts.

		let relPos = token.pos
		let relNeg = token.neg

		if (this.internals.positiveCount > 0) {
			relPos = token.pos / this.internals.positiveCount
		}

		if (this.internals.negativeCount > 0) {
			relNeg = token.neg / this.internals.negativeCount
		}

		const rating = relNeg / (relPos + relNeg)

		const all = token.pos + token.neg

		const result =
			(this.config.rob_s * this.config.rob_x + all * rating) /
			(this.config.rob_s + all)

		return result
	}

	private async processText(
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

				// We don't want to have negative values
				if (currentToken.pos < 0) {
					currentToken.pos = 0
				}
				if (currentToken.neg < 0) {
					currentToken.neg = 0
				}

				// Now let's see if we have to update or delete the token
				if (currentToken.pos !== 0 || currentToken.neg !== 0) {
					await this.storage.updateToken(
						token,
						[Math.abs(currentToken.pos), Math.abs(currentToken.neg)],
						this.context
					)
				} else {
					await this.storage.deleteToken(token, this.context)
				}
			} else {
				// We don't have the token.
				// If we unlearn a text, we can't delete it as we don't
				// have it anyway, so do something if we learn a text
				if (action === 'learn') {
					if (type === 'probable') {
						await this.storage.addToken(token, [count, 0], this.context)
					} else if (type === 'improbable') {
						await this.storage.addToken(token, [0, count], this.context)
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
			INTERNALS_KEY,
			[this.internals.positiveCount, this.internals.negativeCount],
			this.context
		)
	}

	/**
	 * This function learns a text from the dataset
	 *
	 * @param text the text to learn
	 * @param type if the text is probable or improbable
	 * @param context the context to unlearn from
	 */
	async learn(
		text: string,
		type: 'probable' | 'improbable',
		context: string = DEFAULT_DATASET
	) {
		await this.processText(text, type, 'learn', context)
	}

	/**
	 * This function unlearns a text from the dataset
	 *
	 * @param text the text to unlearn
	 * @param type if the text is probable or improbable
	 * @param context the context to unlearn from
	 */
	async unlearn(
		text: string,
		type: 'probable' | 'improbable',
		context: string = DEFAULT_DATASET
	) {
		await this.processText(text, type, 'unlearn', context)
	}

	/**
	 * This function retrieves the internal data of the dataset
	 *
	 * @param context the context to retrieve the data from
	 * @private
	 */
	private async updateContext(context: string = DEFAULT_DATASET) {
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
			}
		}
	}

	async dumpContext(context: string = DEFAULT_DATASET) {
		return await this.storage.getAllTokens(context)
	}
}

export default B8
