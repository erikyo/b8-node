import { Database } from 'sqlite3'

export type B8CONFIG = {
	min_dev: number
	rob_s: number
	rob_x: number
	use_relevant: number
	lexer: {
		min_size?: number
		max_size?: number
		get_uris?: boolean
		get_html?: boolean
		get_bbcode?: boolean
		allow_numbers?: boolean
		stopwords?: string[]
	}
	degenerator: {
		multibyte?: boolean
		encoding?: string
	}
	storage: {
		dbPath: string
	}
}

export interface DATASET {
	positiveCount: number
	negativeCount: number
	totalLearned: number
	totalUnlearned: number
}

export interface TOKEN extends Database {
	pos: number
	neg: number
}

export type TOKENS = Record<string, number>

export interface ROW extends TOKEN {
	token: string
}

export type ROWS = {
	[x: string]: ROW
}
