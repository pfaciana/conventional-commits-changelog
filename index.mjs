import * as fs from 'fs'
import * as path from 'path'
import github from '@actions/github'
import core from '@actions/core'
import { CommitParser } from 'conventional-commits-parser'
import { getBooleanInput, filterRepoData, buildChangelog } from './src/index.js'

const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
const context = github.context
const parser = new CommitParser({
	breakingHeaderPattern: /^(\w*)(?:\(([^)]*)\))?!:\s(.*)$/,
	headerPattern: /^(\w*)(?:\(([^)]*)\))?(!)?:\s(.*)$/,
	headerCorrespondence: ['type', 'scope', 'breaking', 'subject'],
	mergePattern: /^merge\s+(?:branch\s+)?['"`]?(.+?)['"`]?\s+(?:in)?to\s+(?:branch\s+)?['"`]?(.+?)['"`]?$/i,
	mergeCorrespondence: ['source', 'target'],
	fieldPattern: /^\[(.*?)\]$/,
})

async function run() {
	const { releases } = await filterRepoData(octokit, parser, { params: { per_page: 100, ...context.repo } })
	const useDescAsHeader = getBooleanInput(process.env.DESC_HEADER || null)
	useDescAsHeader && Object.keys(releases).forEach(tagName => releases[tagName].header = releases[tagName].description)
	const file = process.env.DEST_FILE || null
	const options = process.env.BUILD_OPTIONS ? JSON.parse(process.env.BUILD_OPTIONS.trim()) : null
	const changelog = buildChangelog(releases, options).join('\n')
	if (file) {
		try {
			fs.writeFileSync(path.join(process.env.GITHUB_WORKSPACE, file.trim()), changelog, 'utf8')
		} catch (error) {
			core.setFailed(`Failed to write file: ${error.message}`)
		}
	}
	core.setOutput('changelog', changelog)
}

run()
