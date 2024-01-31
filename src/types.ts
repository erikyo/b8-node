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
	lexer?: Lexer
	degenerator?: Degenerator
	storage?: SQLiteStorage
}

export interface DATABASE_INTERNAL extends Database {
	spamCount: number
	hamCount: number
	totalLearned: number
	totalUnlearned: number
}
