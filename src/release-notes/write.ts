import * as fs from 'fs-extra'
import { ReleaseNotesFormattingInfo, ChangeLogItem, ReleaseNotes, Version } from './model'

const defaultFormattingInfo: ReleaseNotesFormattingInfo = {
    titleDepth: 1,
    versionsDepth: 2,
}

const padLeft = (text: string, pad: number) => `${Array(pad + 1).join(' ')}${text}`

const formatDescription = (prefix: string | undefined, description: string, indent: number) => {
    const lines = description.split(/\r?\n/g)
    const formattedListItem = lines
        // We indent to do proper markdown formatting of lists
        .map((line, index) => line.length > 0 ? padLeft(line, index === 0 ? 0 : 4 + indent) : line)
        .join('\n')

    if (prefix) {
        return `${prefix}: ${formattedListItem}`
    }

    return formattedListItem
}

const formatHeader = (
    text: string, releaseDate: string | undefined, depth: number, link: boolean,
) => `${'#'.repeat(depth)} ${link ? `[${text}]` : text}${releaseDate ? ` - ${releaseDate}` : ''}`

const paragraph = (text: string | undefined) => !text ? '' : text + '\n'
const formatChanges = (
    items: ChangeLogItem[], formattingInfo: ReleaseNotesFormattingInfo, pad: number = 0,
): string => {
    type Grouped = { [group: string]: ChangeLogItem[] }
    const grouped = items
        .reduce<Grouped>((acc, item) => {
            let group = acc[item.group || '']
            if (!group) {
                group = []
                acc[item.group || ''] = group
            }

            group.push(item)
            return acc
        }, {})

    return Object.keys(grouped)
        .map(group => {
            const formattedGroup = grouped[group]
                .map(change => {
                    const nested = change.children
                        ? '\n' + formatChanges(change.children, formattingInfo, pad + 2)
                        : ''
                    let formattedItem = padLeft(
                        `${change.kind === 'list-item'
                            ? `- ${formatDescription(change.prefix, change.description, pad)}`
                            : change.description
                        }${nested}`,
                        pad)
                    if (change.kind === 'paragraph') {
                        formattedItem += '\n'
                    }
                    return formattedItem
                })
                .join('\n')

            if (group) {
                const headerMd = new Array(formattingInfo.versionsDepth + 1).join('#')
                return `${headerMd} ${group}\n${formattedGroup}`
            }
            return formattedGroup
        })
        .join('\n')
}
const formatVersions = (versions: Version[], formattingInfo: ReleaseNotesFormattingInfo) => {
    return versions.map(version => (
        `${formatHeader(version.version, version.releaseDate, formattingInfo.versionsDepth, true)}
${paragraph(version.summary)}${formatChanges(version.changeLogs, formattingInfo)}`
    )).join('\n')
}

export const toMarkdown = (releaseNotes: ReleaseNotes) => {
    const formattingInfo = releaseNotes.formattingData || defaultFormattingInfo

    return `${formatHeader(releaseNotes.title, undefined, formattingInfo.titleDepth, false)}
${paragraph(releaseNotes.summary)}
${formatVersions(releaseNotes.versions, formattingInfo)}`
}