import { jest, expect, describe, it, beforeAll, beforeEach } from '@jest/globals'
import { SQLiteStorage } from '../src/SQLiteStorage'

describe('DB access', () => {
	let storage: SQLiteStorage

	beforeEach(() => {
		storage = new SQLiteStorage({ dbPath: ':memory:' })
	})

	describe('Storage', () => {
		it('should init the storage', async () => {
			const internals = await storage.getInternals()
			expect(internals).toEqual([0, 0])
		})
	})

	describe('processText', () => {
		it('should process text for learning correctly', async () => {
			storage.addToken('hello', [1, 0])

			const count = await storage.getToken('hello')
			expect(count).toBe([1, 0])
			expect(count).not.toBe([0, 0])
		})

		it('should process text for learning correctly multiple times', async () => {
			// Act
			storage.addToken('hello', [1, 0])
			storage.addToken('hello', [10, 0])

			const count = await storage.getToken('hello')
			console.log(count)
			expect(count).toBe([11, 0])
			expect(count).not.toBe([0, 0])
		})
	})
})
