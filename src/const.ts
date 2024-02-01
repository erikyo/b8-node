export const DB_VERSION = 3
export const CLASSIFIER_TEXT_MISSING = 'CLASSIFIER_TEXT_MISSING'
export const TRAINER_TEXT_MISSING = 'TRAINER_TEXT_MISSING'
export const TRAINER_CATEGORY_MISSING = 'TRAINER_CATEGORY_MISSING'
export const TRAINER_CATEGORY_FAIL = 'TRAINER_CATEGORY_FAIL'
export const HAM = 'ham'
export const SPAM = 'spam'
export const LEARN = 'learn'
export const UNLEARN = 'unlearn'
export const KEY_COUNT_HAM = 'count_ham'
export const KEY_COUNT_SPAM = 'count_spam'
export const urlRegex = /(https?|ftp):\/\/[^\s/$.?#].[^\s]*/gi
export const markupRegex = /<[^>]*>/gi

export const defaultPath = './b8.db'

export const createTableQuery = `CREATE TABLE \`b8_wordlist\` (
		token varchar(190) NOT NULL,
		count_pos int unsigned,
		count_neg int unsigned,
		PRIMARY KEY (token)
	)`
export const insertVersionQuery = `INSERT INTO dataset (token, count_ham) VALUES ('b8*dbversion', ${DB_VERSION} )`
export const insertTextsQuery =
	"INSERT INTO dataset (token, count_ham, count_spam) VALUES ('b8*texts', '0', '0', 'test')"
