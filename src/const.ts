export const DB_VERSION = 3
export const CLASSIFIER_TEXT_MISSING = 'CLASSIFIER_TEXT_MISSING'
export const TRAINER_TEXT_MISSING = 'TRAINER_TEXT_MISSING'
export const TRAINER_CATEGORY_MISSING = 'TRAINER_CATEGORY_MISSING'
export const TRAINER_CATEGORY_FAIL = 'TRAINER_CATEGORY_FAIL'
export const LEXER_TEXT_NOT_STRING = 'LEXER_TEXT_NOT_STRING'
export const LEXER_TEXT_EMPTY = 'LEXER_TEXT_EMPTY'
export const defaultPath = 'b8.db'

export const INIT_QUERIES = {
	createTableQuery: `CREATE TABLE \`dataset\` (
		token varchar(190) NOT NULL,
		pos int unsigned,
		neg int unsigned,
		PRIMARY KEY (token)
	) IF NOT EXISTS;`,
	insertVersionQuery: `INSERT INTO dataset (token, pos) VALUES ('b8*dbversion', ${DB_VERSION} )`,
	insertTextsQuery:
		"INSERT INTO dataset (token, positiveCount, neg) VALUES ('b8*texts', 0, 0)",
}
