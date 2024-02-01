export const DB_VERSION = 3
export const CLASSIFIER_TEXT_MISSING = 'CLASSIFIER_TEXT_MISSING'
export const TRAINER_TEXT_MISSING = 'TRAINER_TEXT_MISSING'
export const TRAINER_CATEGORY_MISSING = 'TRAINER_CATEGORY_MISSING'
export const TRAINER_CATEGORY_FAIL = 'TRAINER_CATEGORY_FAIL'
export const LEXER_TEXT_NOT_STRING = 'LEXER_TEXT_NOT_STRING'
export const LEXER_TEXT_EMPTY = 'LEXER_TEXT_EMPTY'
export const PROBABLE = 'probable'
export const IMPROBABLE = 'improbable'
export const LEARN = 'learn'
export const UNLEARN = 'unlearn'
export const KEY_COUNT_POS = 'count_probable'
export const KEY_COUNT_NEG = 'count_improbable'

export const defaultPath = 'b8.db'

export const INIT_QUERIES = {
	createTableQuery: `CREATE TABLE \`b8_wordlist\` (
		token varchar(190) NOT NULL,
		count_pos int unsigned,
		count_neg int unsigned,
		PRIMARY KEY (token)
	)`,
	insertVersionQuery: `INSERT INTO dataset (token, count_ham) VALUES ('b8*dbversion', ${DB_VERSION} )`,
	insertTextsQuery:
		"INSERT INTO dataset (token, count_ham, count_spam) VALUES ('b8*texts', '0', '0', 'test')",
}
