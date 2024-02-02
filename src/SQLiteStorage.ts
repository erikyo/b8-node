import * as sqlite3 from 'sqlite3'

import { defaultPath, INIT_QUERIES } from './const'
import { B8CONFIG, ROW } from './types'

export class SQLiteStorage {
	private db: sqlite3.Database
	private config: B8CONFIG

	constructor(config: B8CONFIG = {}) {
		// store the config
		this.config = config

		// open	SQLite database
		if (!config.dbPath) {
			this.db = this.createDatabase(defaultPath)
			// Set the default path for later use
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
		if (!this.tableExists('b8_dataset')) {
			this.createTable()
		}
	}

	tableExists(tableName: string): boolean {
		this.db.get(
			'SELECT name FROM sqlite_master WHERE type = "table" AND name = ?',
			[tableName],
			(err, row) => {
				if (err) {
					console.error(err)
				}
				return !!row
			}
		)
		return false
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
			'SELECT pos FROM b8_dataset where token = ?',
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
			'SELECT * FROM b8_dataset where token = ?',
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
			'SELECT * FROM b8_dataset WHERE name = ? LIMIT 1',
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
			this.db.run('INSERT INTO b8_dataset (name) VALUES (?)', [context], (err) => {
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
		const query =
			'INSERT INTO b8_dataset (token, count_ham, count_spam) VALUES (?, ?, ?)'

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
		const query =
			'UPDATE b8_dataset SET count_ham = ?, count_spam = ? WHERE token = ?'

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
		const query = 'DELETE FROM b8_dataset WHERE token = ?'

		this.db.run(query, [token], (err) => {
			if (err) {
				console.error(err)
			}
		})
	}

	learn(tokens: Record<string, string[]>, context: string | null) {
		const insertTokenQuery = `INSERT INTO b8_dataset (token, pos, neg)
VALUES (?, (SELECT token FROM b8_dataset WHERE name = ?), 1)
ON CONFLICT(token) DO UPDATE SET pos = pos + 1`

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
			UPDATE b8_dataset
		SET count = count - 1
		WHERE token = ? AND category_id = (SELECT id FROM b8_dataset WHERE name = ?) AND count > 0`

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
				'SELECT COUNT(token) FROM b8_dataset WHERE token = ? LIMIT 1',
				[token],
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
