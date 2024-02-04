import { beforeEach, describe, expect, it } from '@jest/globals'
import { SQLiteStorage } from '../src/SQLiteStorage'
import { DB_VERSION } from '../src/const'

describe('DB access', () => {
	let storage: SQLiteStorage

	beforeEach(() => {
		storage = new SQLiteStorage({ dbPath: ':memory:' })
	})
	it('should init the storage', async () => {
		const internals = await storage.getInternals()
		const version = await storage.getVersion()
		expect(internals).toMatchObject({
			negativeCount: 0,
			positiveCount: 0,
			totalLearned: 0,
			totalUnlearned: 0,
		})
		expect(version).toBe(DB_VERSION)
	})

	describe('processText', () => {
		it('should add a token', async () => {
			storage.addToken('hello', [1, 0])

			const count = await storage.getToken('hello')
			expect(count).toMatchObject({
				pos: 1,
				neg: 0,
			})
			expect(count).not.toBe([0, 1])
		})

		it('should update an existing token', async () => {
			// Act
			await storage.addToken('hello', [1, 0])
			await storage.updateToken('hello', [10, 0])

			const count = await storage.getToken('hello')
			expect(count).toMatchObject({
				neg: 0,
				pos: 10,
			})
			expect(count).not.toMatchObject({
				neg: 0,
				pos: 11,
			})
		})

		it('should delete a token', async () => {
			// Act
			await storage.addToken('hello', [1, 0])
			await storage.deleteToken('hello')

			const res = await storage.getToken('hello')
			expect(res).toBe(false)
		})

		it('should update a token', async () => {
			// Act
			await storage.updateToken('hello', [0, 1])

			const res = await storage.getToken('hello')
			expect(res).toMatchObject({
				neg: 1,
				pos: 0,
			})
		})

		it('should update a token', async () => {
			// Act
			await storage.createContext('context2')
			await storage.updateToken('hello', [0, 1], 'context2')

			const res = await storage.getToken('hello', 'context2')
			expect(res).toMatchObject({
				neg: 1,
				pos: 0,
			})
		})

		it('should update a token', async () => {
			await storage.addToken('hello')
			await storage.addToken('hello2', [1, 1])
			await storage.addToken('ciao')

			const res = await storage.getTokens(['hello', 'hello2', 'hello3'])
			expect(res).toMatchObject({
				hello: {
					neg: 0,
					pos: 0,
				},
				hello2: {
					neg: 1,
					pos: 1,
				},
			})
		})
	})
})
