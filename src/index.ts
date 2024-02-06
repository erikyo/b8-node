#!/usr/bin/env node

import B8 from './b8.js'

import { globSync } from 'glob'

import fs from 'node:fs/promises'
import yargs from 'yargs'

const b8 = new B8()

export default yargs.prototype
	.title('b8-node')
	.usage('Usage: $0 <command> [options]')
	.version('1.0.0')
	.help('help')
	.command({
		command: 'learn',
		describe: 'Learn from text files',
		builder: (yargs) => {
			return yargs
				.option('pattern', {
					alias: 'p',
					describe: 'Glob pattern for text files to learn from',
					demandOption: true,
				})
				.option('category', {
					alias: 'c',
					describe: 'Category for learning (spam or ham)',
					demandOption: true,
				})
		},
		handler: async (argv) => {
			try {
				const pattern = argv.pattern as string
				const category = argv.category as string

				if (category !== 'probable' && category !== 'improbable') {
					console.error('Invalid category. Must be "probable" or "improbable".')
					process.exit(1)
				}

				const files = getFiles(pattern)

				for (const file of files) {
					const text = await readFile(file)
					await b8.learn(text, category)
				}

				console.log('Learning completed successfully.')
			} catch (error) {
				if (error instanceof Error) {
					console.error('Error during learning:', error.message)
				}
			}
		},
	})
	.command({
		command: 'classify',
		describe: 'Classify text files',
		builder: (yargs: yargs.Argv) => {
			return yargs.option('pattern', {
				alias: 'p',
				describe: 'Glob pattern for text files to classify',
				demandOption: true,
			})
		},
		handler: async (argv: { pattern: string }) => {
			try {
				const pattern = argv.pattern as string

				const files = await getFiles(pattern)

				for (const file of files) {
					const text = await readFile(file)
					const result = await b8.classify(text)
					console.log(`Classification result for ${file}:`, result)
				}
			} catch (error) {
				if (error instanceof Error) {
					console.error('Error during learning:', error.message)
				}
			}
		},
	})
	.demandCommand()
	.help().argv

function getFiles(pattern: string) {
	return globSync(pattern)
}

async function readFile(file: string): Promise<string> {
	return fs.readFile(file, 'utf-8')
}
