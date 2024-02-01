import sqlite3, { Database } from 'sqlite3'

import {
	KEY_COUNT_HAM,
	KEY_COUNT_SPAM,
	createTableQuery,
	defaultPath,
	insertTextsQuery,
	insertVersionQuery,
} from './const'
import { B8CONFIG, DATABASE_INTERNAL } from './types'

export class SQLiteStorage {
	private db: Database

	constructor(config: B8CONFIG = {}) {
		if (!config.dbPath) {
			this.db = this.createDatabase(defaultPath)
			// Ensure tables are created
			this.createTables()
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

	createTables() {
		this.db.run(createTableQuery, (err) => {
			if (err) {
				console.error(err)
			}
		})

		this.db.run(insertVersionQuery, (err) => {
			if (err) {
				console.error(err)
			}
		})

		this.db.run(insertTextsQuery, (err) => {
			if (err) {
				console.error(err)
			}
		})
	}

	/**
	 * Retrieves the internals from the database.
	 *
	 * @return {string[]} A Promise that resolves to the retrieved internals.
	 */
	getInternals(): Promise<DATABASE_INTERNAL> {
		return new Promise((resolve, reject) => {
			this.db.get('SELECT * FROM internals LIMIT 1', (err, row) => {
				if (err) {
					reject(err)
				} else {
					resolve(row as DATABASE_INTERNAL)
				}
			})
		})
	}

	/**
	 * Retrieves the category from the database. If the category does not exist, it is created.
	 *
	 * @param {string} category - The category to retrieve or create
	 * @return {string[]} A Promise that resolves with the retrieved or created category
	 */
	getCategory(category: string): string | null {
		this.db.get(
			'SELECT * FROM categories WHERE name = ? LIMIT 1',
			[category],
			(err, row) => {
				if (!err) {
					return row
				}
				console.error(err)
			}
		)
		return null
	}

	createCategory(category: string): Promise<string> {
		return new Promise((resolve, reject) => {
			this.db.run('INSERT INTO categories (name) VALUES (?)', [category], (err) => {
				if (err) {
					reject(err)
				} else {
					resolve(category)
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
			[token, count[KEY_COUNT_HAM], count[KEY_COUNT_SPAM]],
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
			[count[KEY_COUNT_HAM], count[KEY_COUNT_SPAM], token],
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

	learn(tokens: { [x: string]: string }, category: string) {
		const insertTokenQuery = `INSERT INTO tokens (token, category_id, count)
VALUES (?, (SELECT id FROM categories WHERE name = ?), 1)
ON CONFLICT(token, category_id) DO UPDATE SET count = count + 1`

		Object.entries(tokens).forEach(([token]: string[]) => {
			this.db.run(insertTokenQuery, [token, category], (err) => {
				if (err) {
					console.error(err)
				}
			})
		})
	}

	unlearn(tokens: { [x: string]: string }, category: string) {
		const updateTokenQuery = `
			UPDATE tokens
		SET count = count - 1
		WHERE token = ? AND category_id = (SELECT id FROM categories WHERE name = ?) AND count > 0`

		Object.entries(tokens).forEach((token) => {
			this.db.run(updateTokenQuery, [token, category], (err) => {
				if (err) {
					console.error(err)
				}
			})
		})
	}

	getTokenCount(token: string, category: string): Promise<number> {
		return new Promise((resolve, reject) => {
			this.db.get(
				'SELECT count FROM tokens WHERE token = ? AND category_id = (SELECT id FROM categories WHERE name = ?) LIMIT 1',
				[token, category],
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
