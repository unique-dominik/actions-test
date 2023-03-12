import * as core from '@actions/core'
import {existsSync} from 'fs'
import {copyFile, mkdir, readFile, rmdir} from 'fs/promises'
import {Glob} from 'glob'
import {resolve} from 'path'
import YAML from 'yaml'

export async function appOfApps({
  inDir,
  outDir,
  glob,
  supportedVersions,
  ignore
}: {
  inDir: string
  outDir: string
  glob: string
  supportedVersions: string[]
  ignore?: string[]
}): Promise<void> {
  const opts = {
    cwd: inDir,
    absolute: true,
    ...(ignore && ignore.length ? {ignore} : {})
  }
  core.debug(`Glob options are: ${JSON.stringify(opts)}`)
  const ymlsGlob = new Glob(glob, opts)
  const applicationSpecs: ArgoApplication[] = []
  core.startGroup('Globbing files and evaluating candidates…')
  for await (const candidate of ymlsGlob) {
    try {
      const file = await readFile(candidate, 'utf8')
      const application = YAML.parse(file)
      if (isArgoSpec(supportedVersions, application)) {
        core.debug(`${candidate} seems to be a valid argo application spec!`)
        applicationSpecs.push({path: candidate, crd: application})
      } else {
        core.warning(
          `${candidate} could be read but is not a valid argo application spec.`
        )
      }
    } catch (error) {
      core.warning(
        `${candidate} could not be parsed or read, might be a bad candidate 👹.`
      )
    }
  }
  core.endGroup()
  core.startGroup('Composing specs…')

  if (existsSync(outDir)) await rmdir(outDir)
  await mkdir(outDir, {recursive: true})

  for (const spec of applicationSpecs) {
    const newFileName = specName(spec.crd)
    const newDirName = specDir(spec.crd)
    const target = resolve(process.cwd(), outDir, newDirName, newFileName)
    await copyFile(spec.path, target)
    core.info(`Copied ${spec.path} to ${target}.`)
  }
  core.endGroup()
}

function specDir(application: ArgoApplicationCRD): string {
  return `${
    application.metadata?.annotations?.['unique.app/target-cluster']
      ? application.metadata?.annotations?.['unique.app/target-cluster']
      : '_ambiguous'
  }`
}

function specName(application: ArgoApplicationCRD): string {
  return `${application.metadata?.name}.${
    application.spec?.destination?.namespace
  }.${application.spec?.source?.path?.replace('/', '_')}.yml`
}

function isArgoSpec(supportedVersions: string[], application: any): boolean {
  return (
    application.metadata?.name &&
    application.spec?.destination?.namespace &&
    application.metadata?.annotations?.['unique.app/target-cluster'] && // one could make this an input as well but then one would need yet another input for the annotation itself
    application.spec?.source?.path &&
    application.metadata?.labels?.name &&
    application.kind === 'Application' &&
    supportedVersions.includes(application.apiVersion)
  )
}

interface ArgoApplication {
  path: string
  crd: ArgoApplicationCRD
}

interface ArgoApplicationCRD {
  apiVersion: string
  kind: 'Application'
  metadata: {
    name: string
    labels: {
      name: string
    }
    annotations: {
      'unique.app/target-cluster': string
    }
  }
  spec: {
    source: {
      path: string
    }
    destination: {
      namespace: string
    }
  }
}
