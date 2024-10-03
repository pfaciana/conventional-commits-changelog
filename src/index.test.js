import { describe, it, expect } from 'vitest'
import { findPreviousVersion, groupReleases } from './index' // Adjust the import path as needed

describe('findPreviousVersion', () => {
	const versions = [
		'0.0.0', 'v0.0.1', '0.0.2', 'v0.1.0', '0.1.1', 'v0.1.2', '0.2.0', 'v0.2.1', '0.2.2',
		'1.0.0', 'v1.0.1', '1.0.2', /*******/ /******/ 'v1.1.2', '1.2.0', 'v1.2.1', '1.2.2',
		/******/ 'v2.0.1', '2.0.2', /*******/ /******/ 'v2.1.2', /******/ /*******/ '2.2.2',
	]

	describe('MAJOR version changes', () => {
		it.each([
			['0.0.0', '0.0.0'],
			['v0.0.1', 'v0.0.0'],
			['0.0.2', '0.0.0'],
			['v0.1.0', 'v0.0.0'],
			['0.1.1', '0.0.0'],
			['v0.1.2', 'v0.0.0'],
			['0.2.0', '0.0.0'],
			['v0.2.1', 'v0.0.0'],
			['0.2.2', '0.0.0'],
			['v1.0.0', 'v1.0.0'],
			['1.0.1', '1.0.0'],
			['v1.0.2', 'v1.0.0'],
			['1.1.2', '1.0.0'],
			['v1.2.0', 'v1.0.0'],
			['1.2.1', '1.0.0'],
			['v1.2.2', 'v1.0.0'],
			['2.0.1', '2.0.1'],
			['v2.0.2', 'v2.0.1'],
			['2.1.2', '2.0.1'],
			['v2.2.2', 'v2.0.1'],
		])('should find the correct MAJOR version for %s', (version, expected) => {
			expect(findPreviousVersion(versions, version, 'MAJOR')).toBe(expected)
		})
	})

	describe('MINOR version changes', () => {
		it.each([
			['0.0.0', '0.0.0'],
			['0.0.1', '0.0.0'],
			['0.0.2', '0.0.0'],
			['0.1.0', '0.1.0'],
			['0.1.1', '0.1.0'],
			['0.1.2', '0.1.0'],
			['0.2.0', '0.2.0'],
			['0.2.1', '0.2.0'],
			['0.2.2', '0.2.0'],
			['1.0.0', '1.0.0'],
			['1.0.1', '1.0.0'],
			['1.0.2', '1.0.0'],
			['1.1.2', '1.1.2'],
			['1.2.0', '1.2.0'],
			['1.2.1', '1.2.0'],
			['1.2.2', '1.2.0'],
			['2.0.1', '2.0.1'],
			['2.0.2', '2.0.1'],
			['2.1.2', '2.1.2'],
			['2.2.2', '2.2.2'],
		])('should find the correct MINOR version for %s', (version, expected) => {
			expect(findPreviousVersion(versions, version, 'MINOR')).toBe(expected)
		})
	})

	describe('PATCH version changes', () => {
		it.each([
			['0.0.0', null],
			['0.0.1', '0.0.0'],
			['0.0.2', '0.0.1'],
			['0.1.0', '0.0.2'],
			['0.1.1', '0.1.0'],
			['0.1.2', '0.1.1'],
			['0.2.0', '0.1.2'],
			['0.2.1', '0.2.0'],
			['0.2.2', '0.2.1'],
			['1.0.0', '0.2.2'],
			['1.0.1', '1.0.0'],
			['1.0.2', '1.0.1'],
			['1.1.2', '1.0.2'],
			['1.2.0', '1.1.2'],
			['1.2.1', '1.2.0'],
			['1.2.2', '1.2.1'],
			['2.0.1', '1.2.2'],
			['2.0.2', '2.0.1'],
			['2.1.2', '2.0.2'],
			['2.2.2', '2.1.2'],
		])('should find the correct PATCH version for %s', (version, expected) => {
			expect(findPreviousVersion(versions, version, 'PATCH')).toBe(expected)
		})
	})

	describe('Edge cases and error handling', () => {
		it('should return null if the version is not found in the array', () => {
			expect(findPreviousVersion(versions, '3.0.0', 'MAJOR')).toBeNull()
		})

		it('should throw an error for invalid input types', () => {
			expect(() => findPreviousVersion('not an array', '1.0.0', 'MAJOR')).toThrow()
			expect(() => findPreviousVersion(versions, 123, 'MAJOR')).toThrow()
			expect(() => findPreviousVersion(versions, '1.0.0', 'INVALID')).toThrow()
		})

		it('should handle an empty array', () => {
			expect(findPreviousVersion([], '1.0.0', 'MAJOR')).toBeNull()
		})

		it('should handle unsorted input arrays', () => {
			const unsortedVersions = ['2.0.0', '1.0.0', '3.0.0', '1.1.0']
			expect(findPreviousVersion(unsortedVersions, '3.0.0', 'MAJOR')).toBe('3.0.0')
		})

		it('should handle pre-release versions', () => {
			const versionsWithPreRelease = ['0.0.0-alpha', '0.0.0-beta', '0.0.0', '1.0.0-alpha', '1.0.0-beta', '1.0.0']
			expect(findPreviousVersion(versionsWithPreRelease, '1.0.0', 'PATCH')).toBe('1.0.0-beta')
			expect(findPreviousVersion(versionsWithPreRelease, '1.0.0-beta', 'PATCH')).toBe('1.0.0-alpha')
			expect(findPreviousVersion(versionsWithPreRelease, '1.0.0-alpha', 'PATCH')).toBe('0.0.0')
			expect(findPreviousVersion(versionsWithPreRelease, '1.0.0', 'MINOR')).toBe('1.0.0')
			expect(findPreviousVersion(versionsWithPreRelease, '1.0.0', 'MAJOR')).toBe('1.0.0')
		})
	})
})

describe('groupReleases', () => {
	it('should group releases by minor version by default', () => {
		const releases = {
			'1.2.3': { name: 'Release 1', date: '2023-01-01', messages: ['Fix bug'], commits: { fix: [{ subject: 'Fix bug' }] } },
			'1.2.4': { name: 'Release 2', date: '2023-01-15', messages: ['Add feature'], commits: { feat: [{ subject: 'Add feature' }] } },
			'1.3.0': { name: 'Release 3', date: '2023-02-01', messages: ['Major update'], commits: { feat: [{ subject: 'Major update' }] } },
		}

		const result = groupReleases(releases)

		expect(Object.keys(result)).toEqual(['1.2', '1.3'])
		expect(result['1.2']).toEqual({
			tag: '1.2',
			name: 'Release 1, Release 2',
			date: '2023-01-01, 2023-01-15',
			messages: ['Fix bug', 'Add feature'],
			commits: {
				fix: [{ subject: 'Fix bug' }],
				feat: [{ subject: 'Add feature' }],
			},
		})
		expect(result['1.3']).toEqual({
			tag: '1.3',
			name: 'Release 3',
			date: '2023-02-01',
			messages: ['Major update'],
			commits: {
				feat: [{ subject: 'Major update' }],
			},
		})
	})

	it('should group releases by major version when specified', () => {
		const releases = {
			'1.2.3': { name: 'Release 1', date: '2023-01-01', messages: ['Fix bug'], commits: { fix: [{ subject: 'Fix bug' }] } },
			'1.3.0': { name: 'Release 2', date: '2023-02-01', messages: ['Add feature'], commits: { feat: [{ subject: 'Add feature' }] } },
			'2.0.0': { name: 'Release 3', date: '2023-03-01', messages: ['Major update'], commits: { feat: [{ subject: 'Major update' }] } },
		}

		const result = groupReleases(releases, 'major')

		expect(Object.keys(result)).toEqual(['1', '2'])
		expect(result['1']).toEqual({
			tag: '1',
			name: 'Release 1, Release 2',
			date: '2023-01-01, 2023-02-01',
			messages: ['Fix bug', 'Add feature'],
			commits: {
				fix: [{ subject: 'Fix bug' }],
				feat: [{ subject: 'Add feature' }],
			},
		})
		expect(result['2']).toEqual({
			tag: '2',
			name: 'Release 3',
			date: '2023-03-01',
			messages: ['Major update'],
			commits: {
				feat: [{ subject: 'Major update' }],
			},
		})
	})

	it('should handle releases with missing properties', () => {
		const releases = {
			'1.0.0': { name: 'Release 1' },
			'1.1.0': { date: '2023-01-01' },
			'1.2.0': { messages: ['Update'], commits: { chore: [{ subject: 'Update' }] } },
		}

		const result = groupReleases(releases)

		expect(Object.keys(result)).toEqual(['1.0', '1.1', '1.2'])
		expect(result['1.0']).toEqual({
			tag: '1.0',
			name: 'Release 1',
			date: '',
			messages: [],
			commits: {},
		})
		expect(result['1.1']).toEqual({
			tag: '1.1',
			name: null,
			date: '2023-01-01',
			messages: [],
			commits: {},
		})
		expect(result['1.2']).toEqual({
			tag: '1.2',
			name: null,
			date: '',
			messages: ['Update'],
			commits: {
				chore: [{ subject: 'Update' }],
			},
		})
	})

	it('should handle pre-release versions', () => {
		const releases = {
			'1.0.0-alpha.1': { name: 'Alpha 1', date: '2023-01-01', messages: ['Initial alpha'], commits: { feat: [{ subject: 'Initial alpha' }] } },
			'1.0.0-beta.1': { name: 'Beta 1', date: '2023-01-15', messages: ['Beta release'], commits: { feat: [{ subject: 'Beta release' }] } },
			'1.0.0': { name: 'Release 1', date: '2023-02-01', messages: ['Stable release'], commits: { feat: [{ subject: 'Stable release' }] } },
		}

		const result = groupReleases(releases)

		expect(Object.keys(result)).toEqual(['1.0'])
		expect(result['1.0']).toEqual({
			tag: '1.0',
			name: 'Alpha 1, Beta 1, Release 1',
			date: '2023-01-01, 2023-01-15, 2023-02-01',
			messages: ['Initial alpha', 'Beta release', 'Stable release'],
			commits: {
				feat: [{ subject: 'Initial alpha' }, { subject: 'Beta release' }, { subject: 'Stable release' }],
			},
		})
	})

	it('should handle an empty releases object', () => {
		const releases = {}

		const result = groupReleases(releases)

		expect(result).toEqual({})
	})

	it('should handle invalid version strings', () => {
		const releases = {
			'invalid': { name: 'Invalid Release', date: '2023-01-01', messages: ['Invalid'], commits: { chore: [{ subject: 'Invalid' }] } },
			'1.0.0': { name: 'Valid Release', date: '2023-01-15', messages: ['Valid'], commits: { feat: [{ subject: 'Valid' }] } },
		}

		const result = groupReleases(releases)

		expect(Object.keys(result)).toEqual(['1.0'])
		expect(result['1.0']).toEqual({
			tag: '1.0',
			name: 'Valid Release',
			date: '2023-01-15',
			messages: ['Valid'],
			commits: {
				feat: [{ subject: 'Valid' }],
			},
		})
	})

	it('correctly groups releases with different commit types', () => {
		const releases = {
			'1.0.1': { name: 'Patch', date: '2023-01-01', messages: ['Fix bug'], commits: { fix: [{ subject: 'Fix bug' }] } },
			'1.0.2': { name: 'Another Patch', date: '2023-01-15', messages: ['Another fix'], commits: { fix: [{ subject: 'Another fix' }] } },
			'1.1.0': { name: 'Feature', date: '2023-02-01', messages: ['Add feature'], commits: { feat: [{ subject: 'Add feature' }] } },
			'1.1.1': { name: 'Chore', date: '2023-02-15', messages: ['Update dependencies'], commits: { chore: [{ subject: 'Update dependencies' }] } },
		}

		const result = groupReleases(releases)

		expect(Object.keys(result)).toEqual(['1.0', '1.1'])
		expect(result['1.0'].commits).toEqual({
			fix: [{ subject: 'Fix bug' }, { subject: 'Another fix' }],
		})
		expect(result['1.1'].commits).toEqual({
			feat: [{ subject: 'Add feature' }],
			chore: [{ subject: 'Update dependencies' }],
		})
	})
})