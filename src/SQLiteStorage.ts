import * as sqlite3 from 'sqlite3'

import { defaultPath, INIT_QUERIES } from './const'
import { B8CONFIG, ROW } from './types'

export class SQLiteStorage {
	private db: sqlite3.Database

	constructor(config: B8CONFIG = {}) {
		if (!config.dbPath) {
			this.db = this.createDatabase(defaultPath)
			// Set default path for later use
			config.dbPath = defaultPath
		} else {
			// open	SQLite database
			this.db = new sqlite3.Database(config.dbPath as string, (err) => {
				if (err) {
					throw new Error('Error initializing database: ' + err)
				}
			})
		}
		// Ensure tables are created
		this.createTable()
	}

	createDatabase(filename: string) {
		return new sqlite3.Database(
			filename,
			sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
			(err) => {
				if (err) {
					throw new Error('Error creating database: ' + err)
				}
			}
		)
	}

	createTable() {
		this.db.exec(INIT_QUERIES.createTableQuery, (err) => {
			if (err) {
				console.error(err)
			}
		})

		this.db.exec(INIT_QUERIES.insertVersionQuery, (err) => {
			if (err) {
				console.error(err)
			}
		})

		this.db.exec(INIT_QUERIES.insertTextsQuery, (err) => {
			if (err) {
				console.error(err)
			}
		})
	}

	getVersion(): number {
		let version = 0
		this.db.get(
			'SELECT positiveCount FROM dataset where token = ?',
			'b8*dbversion',
			(err, row: ROW) => {
				if (err) {
					console.error(err)
				}
				version = row.pos
			}
		)
		return version
	}

	/**
	 * Retrieves the internals from the database.
	 *
	 * @return {object} - An object containing the version and the retrieved internals
	 */
	getInternals() {
		let processedRaw = {
			positiveCount: 0,
			negativeCount: 0,
		}
		this.db.get(
			'SELECT * FROM dataset where token = ?',
			'b8*texts',
			(err, row: ROW) => {
				if (err) {
					console.error(err)
				}
				processedRaw = {
					positiveCount: row.pos,
					negativeCount: row.neg,
				}
			}
		)

		return processedRaw
	}

	/**
	 * Retrieves the context from the database. If the context does not exist, it is created.
	 *
	 * @param {string} context - The context to retrieve or create
	 * @return {string[]} A Promise that resolves with the retrieved or created context
	 */
	getCategory(context: string): string | null {
		this.db.get(
			'SELECT * FROM categories WHERE name = ? LIMIT 1',
			[context],
			(err, row) => {
				if (!err) {
					return row
				}
				console.error(err)
			}
		)
		return null
	}

	createCategory(context: string): Promise<string> {
		return new Promise((resolve, reject) => {
			this.db.run('INSERT INTO categories (name) VALUES (?)', [context], (err) => {
				if (err) {
					reject(err)
				} else {
					resolve(context)
				}
			})
		})
	}

	/**
	 * Adds a token to the database with its count for ham and spam.
	 *
	 * @param {string[]} token - the token to be added
	 * @param {{[x: string]: any}} count - object containing count for ham and spam
	 */
	addToken(token: string[], count: { [x: string]: string } = {}) {
		const query = 'INSERT INTO tokens (token, count_ham, count_spam) VALUES (?, ?, ?)'

		this.db.run(
			query,
			[token, count['count_probable'], count['count_improbable']],
			(err) => {
				if (err) {
					console.error(err)
				}
			}
		)
	}

	updateToken(token: string[], count: { [x: string]: string }) {
		const query = 'UPDATE tokens SET count_ham = ?, count_spam = ? WHERE token = ?'

		this.db.run(
			query,
			[count['count_probable'], count['count_improbable'], token],
			(err) => {
				if (err) {
					console.error(err)
				}
			}
		)
	}

	deleteToken(token: string[]) {
		const query = 'DELETE FROM tokens WHERE token = ?'

		this.db.run(query, [token], (err) => {
			if (err) {
				console.error(err)
			}
		})
	}

	learn(tokens: Record<string, string[]>, context: string | null) {
		const insertTokenQuery = `INSERT INTO tokens (token, category_id, count)
VALUES (?, (SELECT id FROM categories WHERE name = ?), 1)
ON CONFLICT(token, category_id) DO UPDATE SET count = count + 1`

		Object.entries(tokens).forEach((token) => {
			this.db.run(insertTokenQuery, [token, context], (err) => {
				if (err) {
					console.error(err)
				}
			})
		})
	}

	unlearn(tokens: Record<string, string[]>, context: string | null) {
		const updateTokenQuery = `
			UPDATE tokens
		SET count = count - 1
		WHERE token = ? AND category_id = (SELECT id FROM categories WHERE name = ?) AND count > 0`

		Object.entries(tokens).forEach((token) => {
			this.db.run(updateTokenQuery, [token, context], (err) => {
				if (err) {
					console.error(err)
				}
			})
		})
	}

	getTokenCount(token: string[], context: string): Promise<number> {
		return new Promise((resolve, reject) => {
			this.db.get(
				'SELECT count FROM tokens WHERE token = ? AND category_id = (SELECT id FROM categories WHERE name = ?) LIMIT 1',
				[token, context],
				(err, row) => {
					if (err) {
						reject(err)
					} else {
						resolve(row ? Object.values(row).length : 0)
					}
				}
			)
		})
	}
}
