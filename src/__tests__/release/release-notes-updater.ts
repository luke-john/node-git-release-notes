import releaseNotesUpdater from '../../release/release-notes-updater'

it('Gives error on file', () => {
    expect(() => releaseNotesUpdater('', 'v1.0.0'))
        .toThrow('No release notes to update')
})

it('Supports just a top level title', () => {
    expect(releaseNotesUpdater('# Changelog', 'v1.0.0'))
        .toMatchSnapshot()
})

it('Supports having a changelog description', () => {
    expect(releaseNotesUpdater(`# Changelog
This is a changelog`, 'v1.0.0'))
        .toMatchSnapshot()
})

it('Supports having a empty vNext version', () => {
    expect(releaseNotesUpdater(`# Changelog

## vNext`, 'v1.0.0'))
        .toMatchSnapshot()
})

it('Supports vnext with issues', () => {
    expect(releaseNotesUpdater(`# Changelog

## vNext
- A change`, 'v1.0.0'))
        .toMatchSnapshot()
})

it('Supports different leveled headings with issues', () => {
    expect(releaseNotesUpdater(`## Changelog

### vNext
- A change`, 'v1.0.0'))
        .toMatchSnapshot()
})