import * as core from '@actions/core'
import {appOfApps} from './app-of-apps'

async function run(): Promise<void> {
  try {
    const inDir: string = core.getInput('input-directory')
    const outDir: string = core.getInput('output-directory')
    const argoFileGlob: string = core.getInput('argo-file-glob')
    const supportedVersions: string[] =
      core.getMultilineInput('supported-versions')
    const ignore: string[] = core.getMultilineInput('ignore-globs')
    core.debug(
      `Using directory <${inDir}> saving to <${outDir}>, globbing Argo files as <${argoFileGlob}> and only respecting the following versions:`
    )
    supportedVersions.map(v => {
      core.debug(`\t - ${v}`)
    })
    core.debug(`Equally, the following paths will get ignored:`)
    ignore.map(v => {
      core.debug(`\t - ${v}`)
    })

    await appOfApps({
      inDir,
      outDir,
      glob: argoFileGlob,
      supportedVersions,
      ignore
    })

    // core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
