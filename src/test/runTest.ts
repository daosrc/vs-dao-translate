import * as path from 'path';
import { runTests } from '@vscode/test-electron';
import { glob } from 'glob';

export async function run(): Promise<void> {
	const testsRoot = path.resolve(__dirname, '..');

	try {
		// Find all test files
		const testFiles = glob.sync('**/**.test.js', { cwd: testsRoot });

		for (const file of testFiles) {
			const filePath = path.resolve(testsRoot, file);
			await import(filePath);
		}
	} catch (err) {
		console.error(err);
		throw err;
	}
}