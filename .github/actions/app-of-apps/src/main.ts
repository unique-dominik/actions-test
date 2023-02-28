import * as core from '@actions/core'
import { appOfApps } from './app-of-apps'

async function run(): Promise<void> {
  try {
    const inDir: string = core.getInput('input-directory')
    const outDir: string = core.getInput('output-directory')
    core.debug(`Using directory ${inDir} saving to ${outDir} ...`) 

    await appOfApps(inDir, outDir);

    // core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
