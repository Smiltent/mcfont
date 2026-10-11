
import normalizeHex from "../util/normalizeHex.ts"
import escapeXml from "../util/escapeXml.ts"
import glyphWidth from "../util/widths.ts"
import encodeb64 from "../util/base64.ts"
import path from "node:path"
import fs from "node:fs"



type Effect = boolean | string
interface Style {
    bold: boolean
    italic: boolean
    underline: boolean
    strike: boolean
    obfs: boolean
    color?: string
    shadow: Effect
    glow: Effect
}

interface Cell {
    char: string
    style: Style
}



export interface RenderOpts {
    scale?: number
}




const FRESH = { bold: false, italic: false, underline: false, strike: false, obfs: false, shadow: false, glow: false }
const HEX = /^#([0-9a-f]{6}|[0-9a-f]{3})/i
const MAXLINES = 30

// mc default colors
const PALLETE: Record<string, string> = {
    "0": "#000000", "1": "#0000aa", "2": "#00aa00", "3": "#00aaaa", "4": "#aa0000",
    "5": "#aa00aa", "6": "#ffaa00", "7": "#aaaaaa", "8": "#555555", "9": "#5555ff",
    "a": "#55ff55", "b": "#55ffff", "c": "#ff5555", "d": "#ff55ff", "e": "#ffff55",
    "f": "#ffffff"
}

// turns raw text to a list of characters with their specific style
export function parse(input: string) {
    const s = input.replace(/\r\n?/g, "\n").replaceAll("\\n", "\n").toWellFormed()
    const lines: Cell[][] = [[]]
    let style: Style = FRESH

    const push = (char: string) => {
        if (char === "\n") {
            if (lines.length < MAXLINES) {
                lines.push([])
            }
        } else if (char >= " " && char !== "\x7f") {
            lines[lines.length - 1].push({ char, style })
        }
    }

    for (let i = 0; i < s.length;) {
        const char = String.fromCodePoint(s.codePointAt(i)!)

        if (char === "&") {
            const n = (s[i + 1] ?? "").toLowerCase()
            let next: Style | null = null
            let length = 2

            switch (n) {
                case '&':
                    push("&")
                    i += 2
                    continue

                case '#': {
                    const m = HEX.exec(s.slice(i + 1, i + 8))
                    if (m) {
                        next = { ...style, color: normalizeHex(m[0]) }
                        length = 1 + m[0].length
                    }
                    break
                }

                case 'l': next = { ...style, bold: true }; break
                case 'o': next = { ...style, italic: true }; break
                case 'n': next = { ...style, underline: true }; break
                case 'm': next = { ...style, strike: true }; break
                case 'k': next = { ...style, obfs: true }; break
                case 'r': next = { ...FRESH }; break

                case 's':
                case 'g': {
                    let effect: Effect = true
                    const m = HEX.exec(s.slice(i + 2, i + 9))

                    if (m) {
                        effect = normalizeHex(m[0])
                        length += m[0].length
                    }

                    next = n === "s" ? { ...style, shadow: effect } : { ...style, glow: effect }
                    break
                }

                default:
                    if (n in PALLETE) next = { ...style, color: PALLETE[n] }
            }

            if (next) {
                style = next
                i += length
                continue
            }
        }

        push(char)
        i += char.length
    }

    return lines
}

export function plainText(input: string) {
    return parse(input).map((l) => l.map((c) => c.char).join("")).join("\n")
}

// rendering
const BASELINE = 7 // px from top of a line
const LINE_H = 10 // px per line

const fontFile = (name: string) => encodeb64(fs.readFileSync(path.join(process.cwd(), "public", "fonts", name)))
const FONT_BOLD = fontFile("MinecraftBold.woff2")
const FONT_REG = fontFile("Minecraft.woff2")

const CSS = fs.readFileSync(path.join(process.cwd(), "public", "css", "svg.css"), "utf8").replace(/\s+/g, " ")

export function renderSvg(input: string, opts: RenderOpts = {}) {
    const u = Math.min(10, Math.max(1, Math.round(opts.scale ?? 3)))
    const lines = parse(input)

    const height = (lines.length * LINE_H + 4) * u

    const text = lines
        .map((line, i) => {
            const lineText = line.map((item) => item.char).join("")
            return `<text x="${3 * u}" y="${(2 + i * LINE_H + BASELINE) * u}" >${escapeXml(lineText)}</text>`
        })
        .join()

    const label = escapeXml(lines.join("\n"))

    const css =
        `@font-face{font-family:MC;src:url(data:font/woff2;base64,${FONT_REG}) format("woff2")}` +
        // (bold ? `@font-face{font-family:MC;src:url(data:font/woff2;base64,${FONT_BOLD}) format("woff2")}` : "") +
        CSS

    return (
        // `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xml:space="preserve" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">` +
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xml:space="preserve" height="${height}" role="img" aria-label="${label}">` +
        `<title>${label}</title><style>${css}</style>` +
        `${text}</svg>`
    )
}