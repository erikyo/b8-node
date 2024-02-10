import fs from 'fs'
import '@tensorflow/tfjs-backend-cpu'
import '@tensorflow/tfjs-backend-webgl'
import * as mobilenet from '@tensorflow-models/mobilenet'

const version = 2
const alpha = 0.5

export async function classifyImage(
	imagePath: string
): Promise<{ className: string; probability: number }[]> {
	// Load the model.
	const model = await mobilenet.load({ version, alpha })

	const tfNode = await import('@tensorflow/tfjs-node')

	const imgBuffer = fs.readFileSync(imagePath)
	const tensor = tfNode.node.decodeImage(imgBuffer, 3)

	// Make a prediction
	return await model.classify(tensor)
}
