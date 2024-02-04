import * as sqlite3 from 'sqlite3'

import { DB_VERSION, defaultPath, INTERNALS } from './const'
import { B8CONFIG, DATASET, ROW, ROWS, TOKEN } from './types'

export class SQLiteStorage {
	private db: sqlite3.Database
	private config: B8CONFIG['storage']

	constructor(config: B8CONFIG['storage']) {
		// store the config
		this.config = config

		// open	SQLite database
		if (!config || !config.dbPath) {
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

		// Ensure the default table is created
		if (!this.tableExists('b8_dataset')) {
			this.createContext('b8_dataset')
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

	createTable(tableName: string = 'b8_dataset') {
		const INIT_QUERIES = {
			createTableQuery: `CREATE TABLE IF NOT EXISTS ${tableName}(
				token varchar PRIMARY KEY,
				pos int unsigned,
				neg int unsigned
			);`,
			insertVersionQuery: `INSERT INTO ${tableName} (token, pos) VALUES ('b8*dbversion', ${DB_VERSION} )`,
			insertTextsQuery: `INSERT INTO ${tableName} (token, pos, neg) VALUES (${INTERNALS}, 0, 0)`,
		}

		this.db.serialize(() => {
			this.db.run(INIT_QUERIES.createTableQuery, (err) => {
				if (err) {
					console.error(err)
				}
			})

			this.db.run(INIT_QUERIES.insertVersionQuery, (err) => {
				if (err) {
					console.error(err)
				}
			})

			this.db.run(INIT_QUERIES.insertTextsQuery, (err) => {
				if (err) {
					console.error(err)
				}
			})
		})
	}

	async getVersion(): Promise<number> {
		const token = await this.getToken('b8*dbversion', 'b8_dataset')
		// await the promise and return
		if (token) {
			return token.pos
		} else {
			return 0
		}
	}

	/**
	 * Retrieves the internals from the database.
	 *
	 * @return {object} - An object containing the version and the retrieved internals
	 */
	async getInternals(context: string = 'b8_dataset'): Promise<DATASET | false> {
		const internals = await this.getToken(INTERNALS, context)
		return internals
			? {
					positiveCount: internals.pos,
					negativeCount: internals.neg,
					totalLearned: 0,
					totalUnlearned: 0,
				}
			: internals
	}

	/**
	 * Creates a new context in the database if it doesn't exist.
	 *
	 * @param context
	 */
	createContext(context: string) {
		this.createTable(context)
	}

	/**
	 * Adds a token to the database with its count for ham and spam.
	 *
	 * @param {string[]} token - the token to be added
	 * @param {{[x: string]: any}} count - object containing count for ham and spam
	 * @param context - the context to add the token to. default to b8_database
	 */
	addToken(
		token: string,
		count: [number, number] = [0, 0],
		context: string = 'b8_dataset'
	): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			const query = `INSERT INTO ${context} (token, pos, neg) VALUES (?, ?, ?)`

			this.db.run(query, [token, ...count], function (err: Error | null) {
				if (err) {
					console.error(err)
					reject(err)
				} else {
					// Check if a row was affected (indicating a successful insert)
					const success = (this.changes || 0) > 0
					resolve(success)
				}
			})
		})
	}

	updateToken(
		token: string,
		count: [number, number],
		context: string = 'b8_dataset'
	): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			const query = `INSERT OR REPLACE INTO ${context} (token, pos, neg) VALUES (?, ?, ?)`

			this.db.run(query, [token, ...count], function (err: Error | null) {
				if (err) {
					console.error(err)
					reject(err)
				} else {
					// Check if a row was affected (indicating a successful update or insert)
					const success = (this.changes || 0) > 0
					resolve(success)
				}
			})
		})
	}
	addTokens(token: ROWS, context: string = 'b8_dataset'): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			const query = `INSERT OR REPLACE INTO ${context} (token, pos, neg) VALUES (?, ?, ?)`

			this.db.all(query, token, function (err: Error | null, res) {
				if (err) {
					console.error(err)
					reject(err)
				} else {
					// Check if a row was affected (indicating a successful update or insert)
					const success = (res.length || 0) > 0
					resolve(success)
				}
			})
		})
	}

	deleteToken(token: string, context: string = 'b8_dataset'): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			const query = `DELETE FROM ${context} WHERE token = ?`

			this.db.run(query, [token], function (err: Error | null) {
				if (err) {
					console.error(err)
					reject(err)
				} else {
					// Check if a row was affected (indicating a successful delete)
					const success = (this.changes || 0) > 0
					resolve(success)
				}
			})
		})
	}

	getToken(token: string, context: string = 'b8_dataset'): Promise<ROW | false> {
		return new Promise<ROW | false>((resolve, reject) => {
			const query = `SELECT pos, neg
                     FROM ${context}
                     WHERE token = ?
                     LIMIT 1`

			this.db.get(query, [token], (err, row: ROW) => {
				if (err) {
					console.error(err)
					reject(err)
				} else {
					if (row) {
						resolve(row)
					}
					resolve(false)
				}
			})
		})
	}

	getTokens(
		tokens: string[],
		context: string = 'b8_dataset'
	): Promise<Record<string, TOKEN>> {
		return new Promise<Record<string, TOKEN>>((resolve, reject) => {
			const placeholders = tokens.map(() => '?').join(', ')
			const query = `SELECT token, pos, neg
                     FROM ${context}
                     WHERE token IN (${placeholders})
                     ORDER BY token`

			this.db.all(query, tokens, (err, rows: ROWS) => {
				if (err) {
					console.error(err)
					reject(err)
				} else {
					const tokenMap = new Map<string, TOKEN>()
					Object.entries(rows).forEach(([, row]) =>
						tokenMap.set(row.token, { pos: row.pos, neg: row.neg } as TOKEN)
					)

					// return an object if rows are found
					if (tokenMap.size > 0) {
						resolve(Object.fromEntries(tokenMap))
					}
				}
			})
		})
	}
}
