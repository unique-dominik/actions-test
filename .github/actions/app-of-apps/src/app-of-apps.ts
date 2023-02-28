import * as core from '@actions/core';
import { copyFile, mkdir, readFile } from "fs/promises";
import { Glob } from 'glob';
import { resolve } from 'path';
import YAML from 'yaml';

export async function appOfApps(inDir: string, outDir: string): Promise<void> {
  const ymlsGlob = new Glob(`**/*argo.{yml,yaml}`, { cwd: inDir, absolute: true }); // TODO should be input param
  const applicationSpecs: ArgoApplication[] = [];
  core.startGroup('Globbing files and evaluating candidates…');
  for await (const candidate of ymlsGlob) {
    try {
      const file = await readFile(candidate, 'utf8')
      const application = YAML.parse(file);
      if (isArgoSpec(application)) {
        core.debug(`${candidate} seems to be a valid argo application spec!`)
        applicationSpecs.push({path: candidate, crd: application});
      } else {
        core.warning(`${candidate} could be read but is not a valid argo application spec.`)
      }
    } catch (error: any) {
      core.warning(`${candidate} could not be parsed or read, might be a bad candidate 👹.`)
    }
  }
  core.endGroup();
  core.startGroup('Evaluating specs…');
  await mkdir(outDir);
  for (const spec of applicationSpecs) {
    const newFileName = specName(spec.crd);
    const target = resolve(process.cwd(), outDir, newFileName);
    await copyFile(spec.path, target);
    core.info(`Copied ${spec.path} to ${target}.`)
  }
  core.endGroup();
}

function specName(application: ArgoApplicationCRD): string {
  return `${application.metadata?.name}.${application.metadata?.namespace}.${application.apiVersion.replace('/', '_')}.yml`;
}

function isArgoSpec(application: any) {
  return application.metadata?.name
    && application.metadata?.namespace
    && application.metadata?.labels?.name
    && application.kind === 'Application'
    && ['argoproj.io/v1alpha1'].includes(application.apiVersion);
}

interface ArgoApplication {
  path: string;
  crd: ArgoApplicationCRD;
}

interface ArgoApplicationCRD {
  apiVersion: string;
  kind: 'Application';
  metadata: {
    name: string;
    namespace: string;
    labels: {
      name: string;
    }
  }
}