export const DB_VERSION = 3
export const CLASSIFIER_TEXT_MISSING = 'CLASSIFIER_TEXT_MISSING'
export const TRAINER_TEXT_MISSING = 'TRAINER_TEXT_MISSING'
export const TRAINER_CATEGORY_MISSING = 'TRAINER_CATEGORY_MISSING'
export const TRAINER_CATEGORY_FAIL = 'TRAINER_CATEGORY_FAIL'
export const LEXER_TEXT_NOT_STRING = 'LEXER_TEXT_NOT_STRING'
export const LEXER_TEXT_EMPTY = 'LEXER_TEXT_EMPTY'
export const defaultPath = 'b8.db'

export const INIT_QUERIES = {
	createTableQuery: `CREATE TABLE IF NOT EXISTS b8_dataset(
		token varchar PRIMARY KEY,
		pos int unsigned,
		neg int unsigned
	);`,
	insertVersionQuery: `INSERT INTO b8_dataset (token, pos) VALUES ('b8*dbversion', ${DB_VERSION} )`,
	insertTextsQuery:
		"INSERT INTO b8_dataset (token, pos, neg) VALUES ('b8*texts', 0, 0)",
}
