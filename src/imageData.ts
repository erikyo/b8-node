/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import tf from '@tensorflow/tfjs'
import assert from 'assert'
import { PathLike } from 'node:fs'
import { readFile } from 'node:fs/promises'

// MNIST data constants:
const IMAGE_HEADER_MAGIC_NUM = 2051
const IMAGE_HEADER_BYTES = 16
const IMAGE_HEIGHT = 28
const IMAGE_WIDTH = 28
const IMAGE_FLAT_SIZE = IMAGE_HEIGHT * IMAGE_WIDTH
const LABEL_HEADER_MAGIC_NUM = 2049
const LABEL_HEADER_BYTES = 8
const LABEL_RECORD_BYTE = 1
const LABEL_FLAT_SIZE = 10

interface DataSetPaths {
	train_images: string[]
	train_labels: string[]
	test_images: string[]
	test_labels: string[]
}

// Downloads a test file only once and returns the buffer for the file.
async function loadFiles(filenames: PathLike[]) {
	const files = []
	for (const file of filenames) {
		files.push(readFile(file))
	}
	return Promise.all(files).then((buffers) => {
		return buffers.map((buffer) => {
			return buffer
		})
	})
}

function loadHeaderValue(buffer: Buffer, headerLength: number) {
	const headerValues = []
	for (let i = 0; i < headerLength / 4; i++) {
		// Header data is stored in-order (aka big-endian)
		headerValues[i] = buffer.readUInt32BE(i * 4)
	}
	return headerValues
}

async function loadImages(filename: PathLike[]) {
	const buffer = (await loadFiles(filename)) as Buffer[]

	const headerBytes = IMAGE_HEADER_BYTES
	const recordBytes = IMAGE_HEIGHT * IMAGE_WIDTH

	const headerValues = buffer.map((buf) => loadHeaderValue(buf, headerBytes))
	assert.equal(headerValues[0], IMAGE_HEADER_MAGIC_NUM)
	assert.equal(headerValues[2], IMAGE_HEIGHT)
	assert.equal(headerValues[3], IMAGE_WIDTH)

	const images: Float32Array[] = []
	let index = headerBytes
	buffer.forEach((buf) => {
		while (index < buf.byteLength) {
			const array = new Float32Array(recordBytes)
			for (let i = 0; i < recordBytes; i++) {
				// Normalize the pixel values into the 0-1 interval, from
				// the original 0-255 interval.
				array[i] = buf.readUInt8(index++) / 255
			}
			images.push(array)
		}
	})

	assert.equal(images.length, headerValues[1])
	return images
}

async function loadLabels(labels: string[]) {
	const headerBytes = LABEL_HEADER_BYTES
	const recordBytes = LABEL_RECORD_BYTE

	// convert the strings to a buffer
	const buffer = labels.map((label) => Buffer.from(label, 'utf8')) as Buffer[]

	const headerValues = buffer.map((buf) => loadHeaderValue(buf, headerBytes))
	assert.equal(headerValues[0], LABEL_HEADER_MAGIC_NUM)

	const bufferedLabels: Int32Array[] = []
	let index = headerBytes
	for (const buf of buffer) {
		while (index < buf.byteLength) {
			const array = new Int32Array(recordBytes)
			for (let i = 0; i < recordBytes; i++) {
				array[i] = buf.readUInt8(index++)
			}
			bufferedLabels.push(array)
		}
	}

	assert.equal(bufferedLabels.length, headerValues[1])
	return bufferedLabels
}

/** Helper class to handle loading training and test data. */
export default class MnistDataset {
	testBatchIndex: number
	trainBatchIndex: number
	testSize: number
	trainSize: number
	dataset: Record<string, Int32Array[] | Float32Array[]> | undefined

	constructor() {
		this.dataset = undefined
		this.trainSize = 0
		this.testSize = 0
		this.trainBatchIndex = 0
		this.testBatchIndex = 0
	}

	/** Loads training and test data. */
	async loadData(datasetPath: DataSetPaths) {
		const newDataset = await Promise.all([
			loadImages(datasetPath.train_images),
			loadLabels(datasetPath.train_labels),
			loadImages(datasetPath.test_images),
			loadLabels(datasetPath.test_labels),
		])

		this.dataset = {
			train_images: newDataset[0],
			train_labels: newDataset[1],
			test_images: newDataset[2],
			test_labels: newDataset[3],
		}
		this.trainSize = this.dataset.train_images.length
		this.testSize = this.dataset.test_images.length
	}

	getTrainData() {
		return this.getData_(true)
	}

	getTestData() {
		return this.getData_(false)
	}

	getData_(isTrainingData: boolean) {
		let imagesIndex: number, labelsIndex: number
		if (isTrainingData) {
			imagesIndex = 0
			labelsIndex = 1
		} else {
			imagesIndex = 2
			labelsIndex = 3
		}
		if (this.dataset === undefined) {
			throw new Error('Data not loaded yet')
		}
		const size = this.dataset[imagesIndex].length

		tf.util.assert(
			this.dataset[labelsIndex].length === size,
			() =>
				`Mismatch in the number of images (${size}) and the number of labels (${size})`
		)

		// Only create one big array to hold a batch of images.
		const imagesShape = [size, IMAGE_HEIGHT, IMAGE_WIDTH, 1]
		const images = new Float32Array(tf.util.sizeFromShape(imagesShape))
		const labels = new Int32Array(tf.util.sizeFromShape([size, 1]))

		let imageOffset = 0
		let labelOffset = 0
		for (let i = 0; i < size; ++i) {
			images.set(this.dataset[imagesIndex][i], imageOffset)
			labels.set(this.dataset[labelsIndex][i], labelOffset)
			imageOffset += IMAGE_FLAT_SIZE
			labelOffset += 1
		}

		return {
			images: tf.tensor4d(images, imagesShape as [number, number, number, number]),
			labels: tf.oneHot(tf.tensor1d(labels, 'int32'), LABEL_FLAT_SIZE).toFloat(),
		}
	}
}
