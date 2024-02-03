import { B8CONFIG } from './types'

export class Degenerator {
	private config: B8CONFIG['degenerator']
	degenerates: Record<string, string[]>

	constructor(config = {}) {
		// Validate config data
		this.config = config
		this.degenerates = {}
	}

	degenerate(words: string[]) {
		for (const word of words) {
			this.degenerates[word] = this.degenerateWord(word)
		}
	}

	flattenDegenerates(record: Record<string, string[]>): string[] {
		let result: string[] = []
		Object.keys(record).forEach((key) => {
			result = result.concat(record[key])
		})
		return result
	}

	/**
	 * Deletes duplicates of a word from a list.
	 *
	 * @param {string} word - the word to compare against duplicates
	 * @param {Array} list - the list to remove duplicates from
	 * @return {Array} the list with duplicates removed
	 */
	deleteDuplicates(word: string, list: string[]) {
		const listProcessed: string[] = []

		list.forEach((altWord) => {
			if (altWord !== word) {
				listProcessed.push(altWord)
			}
		})

		return listProcessed
	}

	degenerateWord(word: string) {
		if (this.degenerates[word as keyof typeof this.degenerates]) {
			return this.degenerates[word as keyof typeof this.degenerates]
		}

		let lower, upper, first

		if (!this.config?.multibyte) {
			lower = word.toLowerCase()
			upper = word.toUpperCase()
			first = upper.charAt(0) + lower.slice(1)
		} else {
			// TODO: to locale upper and lower case
			lower = word.toLowerCase()
			upper = word.toUpperCase()
			first = upper.charAt(0) + lower.slice(1)
		}

		const upperLower = [lower, upper, first]

		const degenerate = this.deleteDuplicates(word, upperLower)

		degenerate.push(word)

		// Add alternative words
		degenerate.forEach((altWord) => {
			if (altWord.match(/[!?]$/)) {
				// Look for stuff like !!! and ???
				if (altWord.match(/[!?]{2,}$/)) {
					const tmp = altWord.replace(/([!?])$/, '$1')
					degenerate.push(tmp)
				}

				// Add versions with different !s and ?s
				const tmp = altWord.replace(/([!?])$/, '')
				degenerate.push(tmp)
			}

			// Look for "..." at the end of the word
			let altWordInt = altWord
			while (altWordInt.match(/[.]$/)) {
				altWordInt = altWordInt.slice(0, -1)
				degenerate.push(altWordInt)
			}
		})

		const uniqueDegenerates = this.deleteDuplicates(word, degenerate)

		this.degenerates[word] = uniqueDegenerates

		return uniqueDegenerates
	}
}
