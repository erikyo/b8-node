import sqlite3, { Database } from 'sqlite3'

import { KEY_COUNT_HAM, KEY_COUNT_SPAM } from './const'
import { B8CONFIG, DATABASE_INTERNAL } from './types'

const defaultPath = './b8.db'

export class SQLiteStorage {
	private db: Database

	constructor(config: B8CONFIG = {}) {
		if (!config.dbPath) {
			this.createDatabase(defaultPath)
			config.dbPath = defaultPath
		}
		// Initialize SQLite database
		this.db = new sqlite3.Database(config.dbPath as string, (err) => {
			if (err) {
				throw new Error('Error initializing database: ' + err)
			}
		})

		// Ensure tables are created
		this.createTables()
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
		// Create tables if they don't exist
		// @ts-ignore
		this.db.run(`CREATE TABLE IF NOT EXISTS internals (
        id INTEGER PRIMARY KEY,
        totalLearned INTEGER DEFAULT 0,
        totalUnlearned INTEGER DEFAULT 0,
        hamCount INTEGER DEFAULT 0,
        spamCount INTEGER DEFAULT 0
      )
    `)

		// @ts-ignore
		this.db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      )
    `)

		this.db.run(`CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY,
        token TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        count INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )

      const createTableQuery = \`
        CREATE TABLE IF NOT EXISTS b8_wordlist (
            token varchar(190) NOT NULL,
            count_ham int unsigned,
            count_spam int unsigned,
            PRIMARY KEY (token)
        )\`;

		this.db.run(createTableQuery, (err) => {
			if (err) {
				console.error(err);
			}
		});

		const insertVersionQuery = \`
			INSERT INTO b8_wordlist (token, count_ham) VALUES ('b8*dbversion', '3')\`;

		this.db.run(insertVersionQuery, (err) => {
			if (err) {
				console.error(err);
			}
		});

		const insertTextsQuery = \`
			INSERT INTO b8_wordlist (token, count_ham, count_spam) VALUES ('b8*texts', '0', '0')\`;

		this.db.run(insertTextsQuery, (err) => {
			if (err) {
				console.error(err);
			}
		});
    `)
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
		const insertTokenQuery = `INSERT INTO tokens (token, category_id, count) VALUES (?, (SELECT id FROM categories WHERE name = ?), 1) ON CONFLICT(token, category_id) DO UPDATE SET count = count + 1`

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
