import imageData from './imageData'
import imageModel from './imageModel'
import { Scalar } from '@tensorflow/tfjs-node'

export async function learnImage(
	imagePath: string[],
	description: string[],
	testImagesPath: string[],
	testImagesLabels: string[],
	epochs = 20,
	batchSize = 128,
	modelSavePath = 'b8-images.json'
) {
	// Load the model.
	const imageDataset = new imageData()
	await imageDataset.loadData({
		train_images: imagePath,
		train_labels: description,
		test_images: testImagesPath,
		test_labels: testImagesLabels,
	})
	const { images: trainImages, labels: trainLabels } = imageDataset.getTrainData()
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

	const { images: testImages, labels: testLabels } = imageDataset.getTestData()
	const evalOutput: Scalar | Scalar[] = imageModel.evaluate(testImages, testLabels)

	console.log(evalOutput)
	console.log(
		`\nEvaluation result:\n Loss = ${(evalOutput as Scalar[])[0].dataSync()[0].toFixed(3)}; Accuracy = ${(evalOutput as Scalar[])[1].dataSync()[0].toFixed(3)}`
	)

	await imageModel.save(`file://${modelSavePath}`)
	console.log(`Saved model to path: ${modelSavePath}`)
}
