import fs from 'fs'
import '@tensorflow/tfjs-backend-cpu'
import '@tensorflow/tfjs-backend-webgl'
import * as mobilenet from '@tensorflow-models/mobilenet'
import imageData from './imageData'
import imageModel from './imageModel'
import { Scalar } from '@tensorflow/tfjs-node'

const version = 2
const alpha = 0.5

export async function classifyImage(
	imagePath: string
): Promise<{ className: string; probability: number }[]> {
	// Load the model.
	const model = await mobilenet.load({ version, alpha })

	const tf = await import('@tensorflow/tfjs-node')

	const imgBuffer = fs.readFileSync(imagePath)
	const tensor = tf.node.decodeImage(imgBuffer, 3)

	// Make a prediction
	return await model.classify(tensor)
}

export async function learnImage(
	imagePath: string,
	description: string,
	epochs = 20,
	batchSize = 128,
	modelSavePath = 'b8-images.json'
) {
	// Load the model.
	const imagedata = new imageData()
	await imagedata.loadData()
	const { images: trainImages, labels: trainLabels } = imagedata.getTrainData()
	imageModel.summary()

	let epochBeginTime
	let millisPerStep
	const validationSplit = 0.15
	const numTrainExamplesPerEpoch = trainImages.shape[0] * (1 - validationSplit)
	const numTrainBatchesPerEpoch = Math.ceil(numTrainExamplesPerEpoch / batchSize)
	await imageModel.fit(trainImages, trainLabels, {
		epochs,
		batchSize,
		validationSplit,
	})

	// this is how I avoid alerts for unused vars :)
	console.log(
		imagePath,
		epochBeginTime || '',
		millisPerStep || '',
		numTrainExamplesPerEpoch,
		numTrainBatchesPerEpoch
	)

	const { images: testImages, labels: testLabels } = imagedata.getTestData()
	const evalOutput: Scalar | Scalar[] = imageModel.evaluate(testImages, testLabels)

	console.log(evalOutput)
	console.log(
		`\nEvaluation result:\n Loss = ${(evalOutput as Scalar[])[0].dataSync()[0].toFixed(3)}; Accuracy = ${(evalOutput as Scalar[])[1].dataSync()[0].toFixed(3)}`
	)

	await imageModel.save(`file://${modelSavePath}`)
	console.log(`Saved model to path: ${modelSavePath}`)
}
