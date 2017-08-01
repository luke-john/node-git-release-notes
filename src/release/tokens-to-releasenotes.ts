import { Token } from './parse'
import generateChangeLogFromTokens, { ChangeLogItem } from './tokens-to-changelog'
import { Options } from './options'

export interface ReleaseNotesFormattingInfo {
    titleDepth: number
    versionsDepth: number
}

export interface Version {
    version: string
    summary?: string
    releaseDate?: string
    changeLogs: ChangeLogItem[]
}

export interface ReleaseNotes {
    title: string
    summary?: string
    versions: Version[]
    formattingData?: ReleaseNotesFormattingInfo
}

export default (tokens: Token[], filename: string, options: Options) => {
    if (tokens.length === 0) {
        return
    }

    const title = tokens.splice(0, 1)[0]
    if (title.type !== 'heading') {
        console.error(`Expected first line to be a heading in ${filename}`)
        if (options.debug) {
            console.log('AST:\n', JSON.stringify(tokens))
        }
        return
    }
    const releaseNotes: ReleaseNotes = {
        title: title.text,
        versions: []
    }
    let token: Token | undefined

    token = tokens.shift(); if (!token) return releaseNotes
    while (token.type === 'paragraph' || token.type === 'text' || token.type === 'space') {
        const additionalLineBreak = token.type === 'paragraph' ? '\n' : ''
        releaseNotes.summary = releaseNotes.summary
            ? `${releaseNotes.summary}\n${additionalLineBreak}${token.text || ''}` 
            : `${additionalLineBreak}${token.text}`

        token = tokens.shift(); if (!token) return releaseNotes
    }

    // Now we have title and summary parsed, next token should be a heading
    if (token.type !== 'heading') {
        console.error(`Expecting a heading for the version, found ${token.type} in ${filename}`)
        if (options.debug) {
            console.log('AST:\n', JSON.stringify(tokens))
        }
        return
    }

    // Version numbers all need to be the same heading (but we should accept ## or ### or ####)
    const versionsDepth = token.depth
    releaseNotes.formattingData = {
        titleDepth: title.depth,
        versionsDepth
    }
    const groupedTokens = tokens.reduce((agg, v) => {
        if (v.type === 'heading' && v.depth === versionsDepth) {
            // Hit the next version, so start collecting tokens against it
            agg.push({ version: v.text, tokens: [] })
        } else {
            // Add the token to the last version
            agg[agg.length - 1].tokens.push(v)
        }

        return agg
    }, [{ version: token.text, tokens: [] as Token[] }])

    releaseNotes.versions = groupedTokens.map(v => {
        // Check to see if the first token is a paragraph, which would be a version summary
        let summary: string | undefined = undefined
        let peekedToken = v.tokens[0]
        while (peekedToken && (peekedToken.type === 'paragraph' || peekedToken.type === 'text' || peekedToken.type === 'space')) {
            const additionalLineBreak = peekedToken.type === 'paragraph' ? '\n' : ''
            summary = summary
                ? `${summary}\n${additionalLineBreak}${peekedToken.text || ''}` 
                : `${additionalLineBreak}${peekedToken.text}`
            v.tokens.shift()
            peekedToken = v.tokens[0]
        }

        return {
            version: v.version,
            summary,
            changeLogs: generateChangeLogFromTokens(v.tokens, filename, v.version, options)
        }
    })

    return releaseNotes
}