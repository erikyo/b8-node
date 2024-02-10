#!/usr/bin/env node

import B8 from './b8.js'

import { globSync } from 'glob'

import fs from 'node:fs/promises'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import path from 'node:path'
import { classifyImage } from './imageClassification'
import axios from 'axios'
import { B8CONFIG } from './types'

const b8 = new B8({ storage: { dbPath: 'b8.sqlite' } } as B8CONFIG)

export function b8Cli() {
	return yargs(hideBin(process.argv))
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
					.option('affinity', {
						alias: 'a',
						describe: 'affinity for learning (probable or improbable)',
						demandOption: true,
					})
					.option('context', {
						alias: 'c',
						describe: 'context to use',
						default: undefined,
					})
			},
			handler: async (argv) => {
				try {
					const pattern = argv.pattern as string
					const affinity = argv.affinity as string
					const context = argv.context as string | undefined

					if (affinity !== 'probable' && affinity !== 'improbable') {
						console.error(
							'Invalid affinity. Must be "probable" or "improbable".'
						)
						process.exit(1)
					}

					const files = getFiles(pattern)

					for (const file of files) {
						const text = await readFile(file)
						await b8.learn(text, affinity, context)
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
			command: 'classifyImage',
			describe: 'Classify image files',
			builder: (yargs) => {
				return yargs
					.option('image', {
						alias: 'i',
						describe: 'the path to the image file to classify',
						demandOption: true,
					})
					.option('context', {
						alias: 'c',
						describe: 'context to use',
						default: undefined,
					})
			},
			handler: async (argv) => {
				try {
					const image = argv.pattern as string
					const context = argv.context as string | undefined
					let content = ''
					if (
						['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(
							path.extname(image)
						)
					) {
						const result = await classifyImage(image)
						for (const res of result) {
							content += res.className + ' '
						}
					} else {
						console.error(
							'Invalid image format. Must be one of: jpg, jpeg, png, gif, webp, bmp, tiff.'
						)
					}
					const result = await b8.classify(content, context)
					console.log(
						`Classification result for ${image}:`,
						result,
						'content:',
						content
					)
				} catch (error) {
					if (error instanceof Error) {
						console.error('Error during classification:', error.message)
					}
				}
			},
		})
		.command({
			command: 'classifyUrl',
			describe: 'Classify internet pages',
			builder: (yargs) => {
				return yargs
					.option('url', {
						alias: 'u',
						describe: 'url to classify',
						demandOption: true,
					})
					.option('context', {
						alias: 'c',
						describe: 'context to use',
						default: undefined,
					})
			},
			handler: async (argv) => {
				try {
					const url = argv.pattern as string
					const context = argv.context as string | undefined

					const content: string = await axios.get(url).then((response) => {
						return new Promise((resolve, reject) => {
							if (response.status === 200) {
								resolve(response.data)
							} else {
								reject(response.data)
							}
						})
					})

					if (content) {
						const result = await b8.classify(content, context)
						console.log(
							`Classification result for ${url}:`,
							result,
							'content:',
							content
						)
					}
				} catch (error) {
					if (error instanceof Error) {
						console.error('Error during learning:', error.message)
					}
				}
			},
		})

		.command({
			command: 'dump',
			describe: 'Dump learned data from a context',
			builder: (yargs) => {
				return yargs.option('context', {
					alias: 'c',
					describe: 'context to dump',
					default: undefined,
				})
			},
			handler: async (argv) => {
				try {
					const context = argv.context as string | undefined

					const result = await b8.dumpContext(context)
					console.log(`Dump result for ${context}:`, result)
				} catch (error) {
					if (error instanceof Error) {
						console.error('Error during learning:', error.message)
					}
				}
			},
		})
		.demandCommand()
		.help().argv
}

b8Cli()

function getFiles(pattern: string) {
	return globSync(pattern)
}

async function readFile(file: string): Promise<string> {
	return fs.readFile(file, 'utf-8')
}
