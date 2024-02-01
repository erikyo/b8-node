import { Lexer } from './lexer'
import { Degenerator } from './degenerator'
import { SQLiteStorage } from './SQLiteStorage'
import { Database } from 'sqlite3'

export type B8CONFIG = {
	min_dev?: number
	rob_s?: number
	rob_x?: number
	use_relevant?: number
	dbPath?: string
	lexer?: {
		min_size?: number
		max_size?: number
		get_uris?: boolean
		get_html?: boolean
		get_bbcode?: boolean
		allow_numbers?: boolean
	}
	degenerator?: {
		multibyte?: boolean
		encoding?: string
	}
	storage?: {
		dbPath?: string
	}
}

export interface DATABASE_INTERNAL extends Database {
	spamCount: number
	hamCount: number
	totalLearned: number
	totalUnlearned: number
}
