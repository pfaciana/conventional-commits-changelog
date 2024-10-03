import { execSync } from 'child_process'
import semver from 'semver'

/**
 * @typedef {import('@octokit/core').Octokit} Octokit
 */

/**
 * @typedef {import('conventional-commits-parser').CommitParser} CommitParser
 */

/**
 * @typedef {Object} SemVer
 * @property {number} major The major version number.
 * @property {number} minor The minor version number.
 * @property {number} patch The patch version number.
 * @property {string} version The full version string.
 * @property {string[]} prerelease An array of prerelease components, or null if none.
 * @property {string|null} build The build metadata, or null if none.
 * @property {function(): string} toString A method that returns the full version string.
 */

/**
 * @typedef {Object} Commit
 * @property {string|null} merge
 * @property {Object|null} revert
 * @property {string|null} header
 * @property {string|null} body
 * @property {string|null} footer
 * @property {Array<{title: string, text: string}>} notes
 * @property {string[]} mentions
 * @property {Array<{
 *   raw: string,
 *   action: string|null,
 *   owner: string|null,
 *   repository: string|null,
 *   issue: string,
 *   prefix: string
 * }>} references
 */

/**
 * @typedef {Object} Release
 * @property {string} tag - The tag name of the release.
 * @property {string|null} name - The name of the release, if any.
 * @property {string} date - The date of the release.
 * @property {string|null} description - The description or message associated with the tag.
 * @property {string[]} messages - An array of commit messages for this release.
 * @property {Object.<string, Commit[]>} commits - An object containing commits grouped by type.
 */

const validTypes = ['feat', 'fix', 'chore', 'perf', 'style', 'refactor', 'ci', 'build', 'test', 'docs']
const validTypesNoFeat = validTypes.filter(t => t !== 'feat')

const escapeHTML = str => str
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;')

function getBooleanInput(input) {
	return !['', 'undefined', 'null', 'false', '0', 'no', 'off'].includes(String(input).toLowerCase().trim())
}

/**
 * Finds the previous version in a list of versions based on the specified type.
 *
 * @param {string[]} versions - An array of version strings.
 * @param {string} versionToFind - The version to find the previous version for.
 * @param {'MAJOR' | 'MINOR' | 'PATCH'} [type='PATCH'] - The type of version increment to consider.
 * @returns {string|null} The previous version, or null if not found.
 * @throws {Error} If input parameters are invalid or the version string is invalid.
 */
function findPreviousVersion(versions, versionToFind, type = 'PATCH') {
	type = type.toUpperCase()
	if (!Array.isArray(versions) || typeof versionToFind !== 'string' || !['MAJOR', 'MINOR', 'PATCH'].includes(type)) {
		throw new Error('Invalid input parameters')
	}

	const coercedVersion = semver.coerce(versionToFind, { includePrerelease: true })
	if (!coercedVersion) {
		throw new Error('Invalid version string')
	}

	const sortedVersions = versions.map(v => semver.coerce(v, { includePrerelease: true }).version).filter(Boolean).sort(semver.compare)

	const prefixV = versionToFind.startsWith('v')

	switch (type) {
		case 'MAJOR': {
			const range = `${coercedVersion.major}.0.0`
			const match = sortedVersions.find(v => semver.gte(v, range)) || null
			return prefixV && match ? `v${match}` : match
		}
		case 'MINOR': {
			const range = `${coercedVersion.major}.${coercedVersion.minor}.0`
			const match = sortedVersions.find(v => semver.gte(v, range)) || null
			return prefixV && match ? `v${match}` : match
		}
		case 'PATCH': {
			const index = sortedVersions.findIndex(v => semver.eq(v, coercedVersion))
			const match = index ? sortedVersions[index - 1] : null
			return prefixV && match ? `v${match}` : match
		}
	}

	return null
}

function contains(expr, str) {
	return (new RegExp(`\\b${expr}\\b`)).test(str.toLowerCase())
}

function startsWith(expr, str) {
	return (new RegExp(`^${expr}\\b`)).test(str.toLowerCase())
}

/**
 * @typedef {Object} MessageTypeResult
 * @property {string} type - The determined type of the message.
 * @property {string} [subType] - The subtype of the message, if applicable.
 */

/**
 * Determines the `type` of a commit message based on its content.
 *
 * @param {string} message - The commit message to analyze.
 * @param {Object} [options={}] - Options for determining the message type.
 * @param {MessageTypeResult|false} [options.defaultType=false] - The default type to return if no match is found.
 * @param {MessageTypeResult|false} [options.forceType=false] - Force a specific type, bypassing the analysis.
 * @returns {MessageTypeResult} An object containing the determined type and subtype (if applicable).
 */
function getMessageType(message, options = {}) {
	options = { ...{ defaultType: false, forceType: false }, ...options }
	const { defaultType, forceType } = options

	const c = expr => contains(expr, message)
	const s = expr => startsWith(expr, message)
	const sc = (expr1 = null, expr2 = null) => (expr1 ? s(expr1) : false) || (expr2 ? c(expr2) : false)

	const verbs = ['add', 'correct', 'create', 'improve', 'include', 'update'].join('|')
	const suffix = ['s', 'ed', 'ing'].join('|')
	const e_suffix = ['e', 'es', 'ed', 'ing'].join('|')
	const y_suffix = ['y', 'ies', 'ied', 'ying'].join('|')

	if (forceType === 'feat') {
		switch (true) {
			// Feat (Add)
			case s(`add(${suffix})?`):
			case s(`allow(${suffix})?`):
			case s(`creat(${e_suffix})?`):
			case s(`enabl(${e_suffix})?`):
			case s(`implement(${suffix})?`):
			case s(`includ(${e_suffix})?`):
			case s(`incorporat(${e_suffix})?`):
			case s(`install(${suffix})?`):
			case s(`introduc(${e_suffix})?`):
			case s(`support(${suffix})?`):
				return { type: 'feat', subType: 'add' }
			// Feat (Remove)
			case s(`delet(${e_suffix})?`):
			case s(`deprecat(${e_suffix})?`):
			case s(`disabl(${e_suffix})?`):
			case s(`remov(${e_suffix})?`):
			case s(`uninstall(${suffix})?`):
				return { type: 'feat', subType: 'remove' }
		}

		return { type: 'feat', subType: 'change' }
	}

	switch (true) {
		// Merge
		case s(`merge`):
			return { type: 'merge' }
		// Docs
		case c(`documentation`):
		case c(`(${verbs}).*docs?`):
		case c(`read ?me`):
		case c(`docblocks?`):
		case c(`(${verbs}).*comments?`):
		case c(`license`):
		case c(`change.?log`):
			return { type: 'docs' }
		// CI
		case c(`jenkins`):
		case c(`travis`):
		case c(`teamcity`):
			return { type: 'ci' }
		// Fix
		case c(`bug fix`):
		case s(`revert(${suffix})?`):
		case s(`typo`):
		case s(`prevent`):
			return { type: 'fix' }
		// Chore
		case c(`version bumps?`):
		case s(`bump(${suffix})?`):
		case s(`ignor(${e_suffix})?`):
		case s(`cleanup(${suffix})?`):
		case s(`renam(${e_suffix})?`):
		case s(`upgrad(${e_suffix})?`):
		case s(`init.*commit`):
		case s(`init`):
			return { type: 'chore' }
		// Perf
		case s(`cach(${e_suffix})?`):
		case s(`optimize`):
			return { type: 'perf' }
		// Test
		case sc(`test(${suffix})?`, `test cases?`):
		case c(`(fix|${verbs}|run|remove).*tests?`):
		case c(`unit tests?`):
		case c(`tests? pass(ed)?`):
		case c(`php.?unit`):
		case c(`behat`):
		case c(`pest`):
		case c(`jest`):
		case c(`mocha`):
		case c(`jasmine`):
		case c(`karma`):
		case c(`vitest`):
			return { type: 'test' }
		// Style
		case c(`prettier`):
		case c(`eslint`):
		case c(`jshint`):
		case c(`jslint`):
		case c(`tslint`):
		case c(`beautifier`):
		case c(`stylelint`):
		case c(`linting`):
		case s(`lint`):
			return { type: 'style' }
		// Build
		case !!semver.valid(message):
		case s(`semver`):
		case sc(`build(${suffix})?`, `dist.*(build|folder|dir|directory|files?)`):
		case c(`build.*(status|steps?)`):
		case c(`(update).*build`):
		case c(`distributions?`):
		case c(`(${verbs}).*dist`):
		case c(`peers?`):
		case c(`peer.?dependency`):
		case c(`package.?(lock|json)`):
		case c(`composer.?(lock|json)`):
		case c(`lock.?file`):
		case s(`version`):
		case c(`bower`):
		case c(`brotli`):
		case c(`browserify`):
		case c(`esbuild`):
		case c(`grunt`):
		case c(`gulp`):
		case c(`maven`):
		case c(`node( |.)?js`):
		case c(`node versions?`):
		case c(`npm`):
		case c(`pnpm`):
		case c(`parcel`):
		case c(`rollup`):
		case c(`snowpack`):
		case c(`tsup`):
		case c(`vite`):
		case c(`webpack`):
		case c(`yarn`):
			return { type: 'build' }
		// Refactor
		case s(`convert(${suffix})?`):
		case s(`improv(${e_suffix})?`):
		case s(`mov(${e_suffix})?`):
		case s(`refactor(${suffix})?`):
		case s(`replac(${e_suffix})?`):
		case s(`simplif(${y_suffix})?`):
		case s(`switch(${suffix})?`):
		case s(`tidy`):
			return { type: 'refactor' }
		// Fix 2
		case sc(`fix`, `fix(${e_suffix})`):
		case s(`correct(${suffix}|ion|ions)?`):
		case c(`console.?log`):
			return { type: 'fix' }
		// Chore 2
		case s(`updat(${e_suffix})?`):
			return { type: 'chore' }
		// Feat (Add)
		case s(`add(${suffix})?`):
		case s(`allow(${suffix})?`):
		case s(`creat(${e_suffix})?`):
		case s(`enabl(${e_suffix})?`):
		case s(`implement(${suffix})?`):
		case s(`includ(${e_suffix})?`):
		case s(`incorporat(${e_suffix})?`):
		case s(`install(${suffix})?`):
		case s(`introduc(${e_suffix})?`):
		case s(`support(${suffix})?`):
			return { type: 'feat', subType: 'add' }
		// Feat (Change)
		case s(`adjust(${suffix})?`):
		case s(`append(${suffix})?`):
		case s(`chang(${e_suffix})?`):
		case s(`extend(${suffix})?`):
		case s(`hid(${e_suffix})?`):
		case s(`mak(${e_suffix})?`):
		case s(`modif(${y_suffix})?`):
		case s(`tweak(${suffix})?`):
			return { type: 'feat', subType: 'change' }
		// Feat (Remove)
		case s(`delet(${e_suffix})?`):
		case s(`deprecat(${e_suffix})?`):
		case s(`disabl(${e_suffix})?`):
		case s(`remov(${e_suffix})?`):
		case s(`uninstall(${suffix})?`):
			return { type: 'feat', subType: 'remove' }
		// Build 2
		case c(`build`):
			return { type: 'build' }
		// Chore 3
		case c(`versions?`):
		case c(`upgrade`):
			return { type: 'chore' }
		// Test 2
		case c(`tests?`):
			return { type: 'test' }
		// Fix 3
		case c(`fix`):
			return { type: 'fix' }
		// Refactor 2
		case c(`clean`):
			return { type: 'refactor' }
	}

	return defaultType || { type: 'other' }
}

/**
 * @typedef {Object} ParseCommitMessageOptions
 * @property {MessageTypeResult|false} [defaultType=false] - The default type to use if no type is determined.
 * @property {string[]} [validTypes=[]] - An array of valid commit types.
 */

/**
 * Parses a commit message and determines its type and subtype.
 *
 * @param {Commit} commit - The commit object to parse.
 * @param {CommitParser} parser - The parser object used to parse commit messages.
 * @param {ParseCommitMessageOptions} [options={}] - Options for parsing the commit message.
 * @returns {Commit} The parsed commit object with determined type and subtype.
 */
function parseCommitMessage(commit, parser, options = {}) {
	options = { ...{ defaultType: false, validTypes: [] }, ...options }
	const { defaultType } = options

	for (const type of ['merge', 'revert']) {
		if (commit[type]) {
			commit.type = type
			return commit
		}
	}

	let { type } = commit

	let data = getMessageType(commit.subject ?? commit.header, { defaultType, forceType: type })

	type ??= data.type
	const subType = type === 'feat' ? (data.subType || 'change') : false

	if (options.validTypes.includes(type)) {
		return { ...commit, type, subType }
	}

	commit = parser.parse(`${type}: ${commit.orig}`)

	return { ...commit, type, subType }
}

/**
 * Creates a sorting function for commit group keys based on the provided types.
 *
 * @param {string[]|null} [types=null] - An array of commit types to use for sorting. If null, uses the default valid types.
 * @returns {Function} A sorting function that can be used to sort commit group keys.
 */
function createSortGroupKeys(types = null) {
	const typeOrder = Object.fromEntries((types ?? validTypes).map((type, index) => [type, index]))
	return ([a], [b]) => (typeOrder[a] ?? Infinity) - (typeOrder[b] ?? Infinity)
}

/**
 * @typedef {Object} GetCommitsOptions
 * @property {MessageTypeResult|false} [defaultType=false] - The default type to use if no type is determined.
 * @property {string[]} [validTypes] - An array of valid commit types.
 */

/**
 * Processes an array of commit messages and groups them by type.
 *
 * @param {string[]} messages - An array of commit messages to process.
 * @param {CommitParser} parser - The parser object used to parse commit messages.
 * @param {GetCommitsOptions} [options={}] - Options for processing the commits.
 * @returns {{commits: Commit[], groups: Object.<string, Commit[]>}} An object containing the processed commits and grouped commits.
 */
function getCommits(messages, parser, options = {}) {
	options = { ...{ defaultType: false, validTypes: validTypes }, ...options }
	const { defaultType } = options

	let commits = []
	let groups = {}

	try {
		for (let message of messages) {
			if (!message) continue
			let raw = message, orig = message
			let commit = parser.parse(orig)
			let { type } = commit

			if (type) {
				if (!options.validTypes.includes(type)) {
					commit = parser.parse(orig = orig.replace(': ', ' '))
					type = undefined
				}
			}

			commit = { ...parseCommitMessage({ ...commit, type, orig, raw }, parser, { defaultType, validTypes }), orig, raw }

			commits.push(commit)

			const key = commit.subType ? (commit.type + '_' + commit.subType) : commit.type
			groups[key] ??= []
			groups[key].push(commit)
			//groups[key].push(commit.subject ?? commit.merge ?? commit?.revert?.header)
			//groups[key].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		}
		groups = Object.fromEntries(Object.entries(groups).sort(([a], [b]) => {
			return ((options.validTypes.indexOf(a) ?? Infinity) - (options.validTypes.indexOf(b) ?? Infinity))
		}))

	} catch (e) {
		console.log(e)
	}

	return { commits, groups }
}

/**
 * Extracts notices from a commit based on specified labels and checks.
 *
 * @param {Commit} commit - The commit object to extract notices from.
 * @param {string} label - The label to use for the notice.
 * @param {string|RegExp|null} [check=null] - The check to use for filtering notices. If null, uses the label.
 * @param {string} [breakingLabel='BREAKING CHANGE'] - The label used to identify breaking changes.
 * @returns {string[]} An array of extracted notices.
 */
function getNotices(commit, label, check = null, breakingLabel = 'BREAKING CHANGE') {
	check ??= label

	const notices = commit?.notes?.filter(note => {
		if (check.startsWith('/') && check.endsWith('/')) {
			check = new RegExp(check)
		}
		return check instanceof RegExp ? check.test(note.title) : note.title === check
	}).map(note => note.text) || []

	if (notices.length) {
		return notices
	}

	return (label === breakingLabel && commit.breaking) ? [commit.breaking] : []
}

/**
 * @typedef {Object} BuildChangelogNoticeOptions
 * @property {Object.<string, string|RegExp>} [keys={ 'BREAKING CHANGES': /^BREAKING[ -]CHANGE$/ }] - Mapping of notice labels to their corresponding checks.
 * @property {boolean} [all=false] - Whether to include notices from all commit types.
 * @property {boolean} [inFooter=true] - Whether to place notices in the footer of each release section.
 */

/**
 * @typedef {Object} BuildChangelogOptions
 * @property {boolean} [coerce=true] - Whether to coerce version numbers.
 * @property {boolean} [onlyFirst=false] - Whether to only return the first release
 * @property {boolean} [onlyBody=false] - Whether to include only the body of the changelog.
 * @property {Object.<string, string>} [types={ feat_add: 'Added', feat_change: 'Changed', feat_remove: 'Removed', fix: 'Fixed' }] - Mapping of commit types to changelog sections.
 * @property {BuildChangelogNoticeOptions} [notice={}] - Options for handling notices in the changelog.
 */

/**
 * Builds a changelog from the provided releases data.
 *
 * @param {Object.<string, Release>} releases - An object containing release data.
 * @param {BuildChangelogOptions} [options={}] - Options for building the changelog.
 * @returns {string[]} An array of strings representing the lines of the changelog.
 */
function buildChangelog(releases, options = {}) {
	options ??= {}
	options.coerce ??= true
	options.onlyFirst ??= false
	options.onlyBody ??= false
	options.types ??= { feat_add: 'Added', feat_change: 'Changed', feat_remove: 'Removed', fix: 'Fixed' }
	options.notice ??= {}
	options.notice.keys ??= { 'BREAKING CHANGES': /^BREAKING[ -]CHANGE$/ }
	options.notice.all ??= false
	options.notice.inFooter ??= true

	let lines = []

	!options.onlyBody && lines.push('# Changelog', '')

	for (const [version, release] of Object.entries(releases)) {
		if (Object.keys(release.commits).length) {
			!options.onlyBody && lines.push('', `## ${options.coerce ? semver.coerce(version, { includePrerelease: true }) : version}${release?.date ? ` (${release.date})` : ''}`, '')

			let notices = {}
			let notice = []

			if (Object.keys(options.notice.keys).length) {
				for (const [type, items] of Object.entries(release.commits)) {
					if (options.notice.all || Object.keys(options.types).includes(type)) {
						for (const commit of release.commits[type]) {
							for (const [label, check] of Object.entries(options.notice.keys)) {
								let commitNotices = getNotices(commit, label, check)
								if (commitNotices.length) {
									notices[label] ??= []
									notices[label] = [...notices[label], ...commitNotices]
								}
							}
						}
					}
				}

				if (Object.keys(notices).length) {
					for (const [label, items] of Object.entries(notices)) {
						notice.push(`### ${label}`, '')
						for (const item of items) {
							notice.push(`- ${item}`)
						}
						notice.push('')
					}
				}
			}

			if (release?.header) {
				lines.push(release.header, '')
			}

			if (notice.length && !options.notice.inFooter) {
				lines.push(notice.join('\n'), '')
			}

			for (const [type, title] of Object.entries(options.types)) {
				if (!release.commits[type]) continue
				lines.push(`### ${title}`, '')
				let scopes = {}
				for (const commit of release.commits[type]) {
					scopes[commit?.scope ?? ''] ??= []
					scopes[commit?.scope ?? ''].push(commit)
				}
				for (const scope of Object.keys(scopes).sort()) {
					if (scope) {
						lines.push(`- ${scope}`)
					}
					for (const commit of scopes[scope]) {
						lines.push(`${scope ? '  ' : ''}- ${escapeHTML(commit.subject ?? commit.breaking ?? commit.header ?? commit.merge ?? commit?.revert?.header)}`)
					}
				}
				lines.push('')
			}

			if (notice.length && options.notice.inFooter) {
				lines.push(notice.join('\n'), '')
			}

			if (release?.footer) {
				lines.push(release.footer, '')
			}
		}
		if (options.onlyFirst) break
	}

	return lines
}

/**
 * @typedef {Object} GetRepoDataOptions
 * @property {number} [limit=500] - The maximum number of items to retrieve.
 * @property {Object} [params={ per_page: 100 }] - Parameters for API requests.
 */

/**
 * Retrieves repository data from GitHub API.
 *
 * @async
 * @param {Octokit} octokit - The Octokit instance for making GitHub API calls.
 * @param {string} endpoint - The API endpoint to call.
 * @param {GetRepoDataOptions} [options={}] - Options for retrieving repository data.
 * @returns {Promise<Array>} A promise that resolves to an array of retrieved items.
 */
async function getRepoData(octokit, endpoint, options = {}) {
	options = { ...{ limit: 500, params: { per_page: 100 } }, ...options }

	let items = []

	for await (const response of octokit.paginate.iterator(octokit.rest.repos[endpoint], options.params)) {
		for (const item of response.data) {
			items.push(item)
			if (items.length >= options.limit) {
				return items
			}
		}
		if (response.data.length < (options.params.per_page ?? 30)) {
			return items
		}
	}

	return items
}

/**
 * @typedef {Object} FilterRepoDataOptions
 * @property {number} [limit=500] - The maximum number of items to retrieve.
 * @property {Object} [params={ per_page: 100 }] - Parameters for API requests.
 * @property {boolean|string} [addDate=true] - Whether to add a date to the latest release if missing. If a string, uses that as the date.
 * @property {Object} [defaultType={ type: 'feat', subType: 'change' }] - The default type and subtype for commits without a recognized type.
 */

/**
 * Filters and processes repository data to create a structured representation of releases and commits.
 *
 * @async
 * @param {Octokit} octokit - The Octokit instance for making GitHub API calls.
 * @param {CommitParser} parser - The parser object used to parse commit messages.
 * @param {FilterRepoDataOptions} [options={}] - Configuration options for the function.
 * @returns {Promise<Object>} An object containing structured repository data:
 *   @returns {Array<{name: string, sha: string}>} .tags - Array of tag objects with name and SHA.
 *   @returns {Object.<string, string>} .commits - Object mapping commit SHAs to commit messages.
 *   @returns {Object.<string, Release>} .releases - Object mapping tag names to Release objects.
 *   @returns {string|null} .headTag - The name of the most recent tag, or null if no tags exist.
 * @throws {Error} If there's an issue with API requests or data processing.
 */
async function filterRepoData(octokit, parser, options = {}) {
	options = { ...{ limit: 500, params: { per_page: 100 }, addDate: true, defaultType: { type: 'feat', subType: 'change' } }, ...options }

	const { limit, params } = options

	const [allCommits, allTags, allReleases] = await Promise.all([
		getRepoData(octokit, 'listCommits', { limit, params }),
		getRepoData(octokit, 'listTags', { limit, params }),
		getRepoData(octokit, 'listReleases', { limit, params }),
	])

	const tags = allTags.filter(tag => semver.valid(tag.name)).map(tag => ({ name: tag.name, sha: tag.commit.sha }))
	tags.sort((a, b) => semver.compare(b.name, a.name))
	const commits = Object.fromEntries(allCommits.map(commit => [commit.sha, commit.commit.message]))
	let releases = Object.fromEntries(allReleases.map(({ tag_name, published_at, created_at }) => [tag_name, { date: (published_at || created_at || '').slice(0, 10) }]))
	releases = Object.fromEntries(tags.map((tag, index) => {
		const release = tag.name in releases && releases[tag.name] ? releases[tag.name] : {}
		let releaseDate = release?.date || ''
		if (options.addDate && !releaseDate && tag.name === tags[0].name) {
			releaseDate = (options.addDate === true ? new Date().toISOString().slice(0, 10) : options.addDate)
		}
		const hashes = getCommitSHAs({ base: (index < tags.length - 1 ? tags[index + 1]?.name : null), head: tag.name })
		const messages = hashes.map(sha => commits[sha]).filter(Boolean)
		let { groups } = getCommits(messages, parser, { defaultType: options.defaultType })

		return [tag.name, { tag: tag.name, name: release?.name ?? null, date: releaseDate, description: getTagMessage(tag.name), messages, commits: groups }]
	}))
	const headTag = tags.length ? tags[0].name : null

	return { tags, commits, releases, headTag }
}

/**
 * Retrieves the message for a given tag.
 *
 * @param {string} tagName - The name of the tag to retrieve the message for.
 * @returns {string|null} The tag message, or null if the message is just a valid semver or if there's an error.
 */
function getTagMessage(tagName) {
	try {
		const command = `git for-each-ref refs/tags/${tagName} --format='%(contents:subject)'`
		const message = execSync(command, { encoding: 'utf-8' }).trim()

		if (!message || semver.valid(message.split(' ').pop())) {
			return null
		}

		return message
	} catch (error) {
		console.error('Error executing git command:', error.message)
		return null
	}
}

/**
 * Retrieves commit SHAs between two tags or commits.
 *
 * @param {{ base: string, head: string }} tags - An object containing the base and head tags or commits.
 * @returns {string[]} An array of commit SHAs.
 */
function getCommitSHAs(tags) {
	try {
		tags = { ...{ base: '', head: 'HEAD' }, ...tags }
		const range = tags.base ? `${tags.base}..${tags.head}` : tags.head
		const command = `git rev-list ${range}`
		const output = execSync(command, { encoding: 'utf-8' })
		return output.trim().split('\n')
	} catch (error) {
		console.error('Error executing git command:', error.message)
		return []
	}
}

/**
 * Groups releases by major or minor version.
 *
 * @param {Object.<string, Release>} releases - The releases to group.
 * @param {'minor' | 'major'} [groupBy='minor'] - Whether to group by minor or major version.
 * @returns {Object.<string, Release>} The grouped releases.
 */
function groupReleases(releases, groupBy = 'minor') {
	let groups = {}

	for (const [version, release] of Object.entries(releases)) {
		let parts = (semver.coerce(version, { includePrerelease: false }) ?? '').toString().split('.')
		if (parts.length !== 3) continue
		parts.pop()
		if (groupBy.toLowerCase() === 'major') {
			parts.pop()
		}
		let group = parts.join('.')
		groups[group] ??= { tag: group, name: [], date: [], messages: [], commits: {} }
		release.name && groups[group].name.push(release.name)
		release.date && groups[group].date.push(release.date)
		release.messages && groups[group].messages.push(...release.messages ?? [])
		for (const [type, commits] of Object.entries(release.commits ?? {})) {
			groups[group].commits[type] ??= []
			groups[group].commits[type].push(...commits)
		}
	}

	for (const [version, release] of Object.entries(groups)) {
		groups[version].name = groups[version].name.join(', ') || null
		groups[version].date = groups[version].date.join(', ') || ''
	}

	return groups
}

export {
	findPreviousVersion,
	getMessageType,
	parseCommitMessage,
	createSortGroupKeys,
	getCommits,
	getNotices,
	buildChangelog,
	getRepoData,
	filterRepoData,
	getCommitSHAs,
	groupReleases,
	getBooleanInput,
	escapeHTML,
}
