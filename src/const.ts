import { B8CONFIG } from './types'

export const DB_VERSION: number = 1
export const CLASSIFIER_TEXT_MISSING = 'CLASSIFIER_TEXT_MISSING'
export const TRAINER_TEXT_MISSING = 'TRAINER_TEXT_MISSING'
export const TRAINER_CATEGORY_MISSING = 'TRAINER_CATEGORY_MISSING'
export const TRAINER_CATEGORY_FAIL = 'TRAINER_CATEGORY_FAIL'
export const LEXER_TEXT_NOT_STRING = 'LEXER_TEXT_NOT_STRING'
export const LEXER_TEXT_EMPTY = 'LEXER_TEXT_EMPTY'
export const defaultPath = 'b8.db'

export const INTERNALS = 'b8*texts'

export const configDefaults: B8CONFIG = {
	min_dev: 0.01,
	rob_s: 0.5,
	rob_x: 0.5,
	use_relevant: 0.95,
	lexer: {
		min_size: 3,
		max_size: 30,
		get_uris: true,
		get_html: true,
		get_bbcode: false,
		allow_numbers: false,
		stopwords: [
			'about',
			'an',
			'are',
			'as',
			'at',
			'be',
			'by',
			'com',
			'for',
			'from',
			'how',
			'in',
			'is',
			'it',
			'of',
			'on',
			'or',
			'that',
			'the',
			'this',
			'to',
			'was',
			'what',
			'when',
			'where',
			'who',
			'will',
			'with',
			'www',
		],
	},
	degenerator: {
		multibyte: true,
		encoding: 'UTF-8',
	},
	storage: {
		dbPath: ':memory:',
	},
}
