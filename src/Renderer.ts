
import normalizeHex from "../util/normalizeHex.ts"
import escapeXml from "../util/escapeXml.ts"
import glyphWidth from "../util/widths.ts"
import { rng, hash } from "../util/rng.ts"
import encodeb64 from "../util/base64.ts"
import darken from "../util/darken.ts"
import path from "node:path"
import fs from "node:fs"

const CSS = fs.readFileSync(path.join(process.cwd(), "public", "css", "svg.css"), "utf8").replace(/\s+/g, " ")
const OUTLINE = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
const FRESH = { bold: false, italic: false, underline: false, strike: false, obfs: false, shadow: false, glow: false }
const HEX = /^#([0-9a-f]{6}|[0-9a-f]{3})/i

// mc default colors
const PALLETE: Record<string, string> = {
    "0": "#000000", "1": "#0000aa", "2": "#00aa00", "3": "#00aaaa", "4": "#aa0000",
    "5": "#aa00aa", "6": "#ffaa00", "7": "#aaaaaa", "8": "#555555", "9": "#5555ff",
    "a": "#55ff55", "b": "#55ffff", "c": "#ff5555", "d": "#ff55ff", "e": "#ffff55",
    "f": "#ffffff"
}

// rendering
const MAXLINES = 30
const BASELINE = 7 // px from top of a line
const LINE_H = 10 // px per line

// obfuscation
const OBFS_FRAMES = 6
const OBFS_SEC = 0.05

// fonts
const fontFile = (name: string) => encodeb64(fs.readFileSync(path.join(process.cwd(), "public", "fonts", name)))
const FONT_BOLD = fontFile("MinecraftBold.woff2")
const FONT_REG = fontFile("Minecraft.woff2")

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

interface Run {
    x: number
    line: number
    text: string
    width: number
    style: Style
    obfs: boolean
}

interface Deco {
    x: number
    line: number
    width: number
    kind: "underline" | "strike"
    style: Style
}

interface RenderOpts {
    scale?: number
}

// turns raw text to a list of characters with their specific style
function parse(input: string) {
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

function plainText(input: string) {
    return parse(input).map((l) => l.map((c) => c.char).join("")).join("\n")
}

// obfuscation
const POOL = new Map<number, string[]>()
for (let i = 33; i < 127; i++) {
    const w = glyphWidth(i)
    POOL.set(w, [...POOL.get(w) ?? [], String.fromCharCode(i)])
}

export function renderSvg(input: string, opts: RenderOpts = {}) {
    const u = Math.min(10, Math.max(1, Math.round(opts.scale ?? 3)))
    const lines = parse(input)
    const rngg = rng(hash(input))

    const runs: Run[] = []
    const decos: Deco[] = []
    let hasBold = false
    let maxX = 0

    lines.forEach((cells, li) => {
        let x = 0
        let run: Run | null = null

        const lastDeco: Partial<Record<Deco["kind"], Deco>> = {}

        for (const { char, style } of cells) {
            const w = glyphWidth(char.codePointAt(0)!, style.bold) * u
            if (style.bold) hasBold = true

            // merge neighbors that share a style
            const key = JSON.stringify(style)
            if (!style.obfs && run && !run.obfs && JSON.stringify(run.style) === key) {
                run.text += char
                run.width += w
            } else {
                run = { x, line: li, text: char, width: w, style, obfs: style.obfs}
                runs.push(run)
            }

            // underline & strikethrough
            for (const kind of ["underline", "strike"] as const) {
                if (!style[kind]) {
                    delete lastDeco[kind]
                    continue
                }

                const d = lastDeco[kind]

                if (d && JSON.stringify(d.style) === key) {
                    d.width += w
                } else {
                    const nd = { x, line: li, width: w, kind, style, }
                    decos.push(nd)
                    lastDeco[kind] = nd
                }
            }

            x += w
        }

        maxX = Math.max(maxX, x)
    })

    const padX = 3 * u
    const padY = 2 * u
    const width = Math.max(maxX, u) + padX * 2
    const height = lines.length * LINE_H * u + padY * 2

    // helper scripts
    const n = (v: number) => +v.toFixed(2)
    const paintOf = (st: Style, layer: "text" | "shadow" | "glow") => {
        if (layer === "text") return st.color ? { fill: st.color } : { cls: "d" }
        
        const eff = layer === "shadow" ? st.shadow : st.glow
        if (typeof eff === "string") return { fill: eff }

        return st.color ? { fill: darken(st.color) } : { cls: "ds" }
    }

    const emitRun = (r: Run, dx: number, dy: number, layer: "text" | "shadow" | "glow") => {
        const paint = paintOf(r.style, layer)
        const x = padX + r.x + dx
        const y = padY + r.line * LINE_H * u + BASELINE * u + dy
        const pos = r.style.italic ? `transform="translate(${n(x)} ${n(y)}) skewX(-14)"` : `x="${n(x)}" y="${n(y)}"`

        const make = (txt: string, extraCls = "", style = "") => {
            const cls = [r.style.bold ? "b" : "", paint.cls ?? "", extraCls].filter(Boolean).join(" ")
            return `<text ${pos}${cls ? ` class="${cls}"` : ""}${paint.fill ? ` fill="${paint.fill}"` : ""}${style ? ` style="${style}"` : ""}>${escapeXml(txt)}</text>`
        }

        if (!r.obfs) return make(r.text)

        const pool = POOL.get(glyphWidth(r.text.codePointAt(0)!))
        if (!pool || pool.length < 2 || r.text === " ") return make(r.text)

        const out = []
        for (let i = 0; i < OBFS_FRAMES; i++) {
            out.push(make(pool[Math.floor(rngg() * pool.length)], "o", `animation-delay:-${n(i * OBFS_SEC)}s`))
        }

        return out.join("")
    }

    const emitDeco = (d: Deco, dx: number, dy: number, layer: "text" | "shadow" | "glow") => {
        const paint = paintOf(d.style, layer)
        const baseline = padY + d.line * LINE_H * u + BASELINE * u
        const y = (d.kind === "underline" ? baseline + u : baseline - 3 * u) + dy

        return `<rect x="${n(padX + d.x + dx)}" y="${n(y)}" width="${n(d.width)}" height="${u}" shape-rendering="crispEdges"${paint.cls ? ` class="${paint.cls}"` : ""}${paint.fill ? ` fill="${paint.fill}"` : ""}/>`
    }

    const layer = (dx: number, dy: number, which: "shadow" | "glow" | "text", pick: (s: Style) => boolean) =>
        runs.filter((r) => pick(r.style)).map((r) => emitRun(r, dx, dy, which)).join("") +
        decos.filter((d) => pick(d.style)).map((d) => emitDeco(d, dx, dy, which)).join("")

    const shadows = layer(u, u, "shadow", (s) => s.shadow !== false)
    const glows = OUTLINE.map(([ox, oy]) => layer(ox * u, oy * u, "glow", (s) => s.glow !== false)).join("")
    const fills = layer(0, 0, "text", () => true)

    const step = 100 / OBFS_FRAMES
    const keyframes = `@keyframes o{0%,${+(step - 0.1).toFixed(1)}%{opacity:1}${+step.toFixed(1)}%,100%{opacity:0}}`

    const css =
        `@font-face{font-family:MC;src:url(data:font/woff2;base64,${FONT_REG}) format("woff2")}` +
        (hasBold ? `@font-face{font-family:MCB;src:url(data:font/woff2;base64,${FONT_BOLD}) format("woff2")}` : "") +
        CSS + (runs.some((r) => r.obfs) ? keyframes : "")

    const label = escapeXml(plainText(input))

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" style="--s:${12 * u}px;--od:${n(OBFS_FRAMES * OBFS_SEC)}s" version="1.1" xml:space="preserve" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">` +
        `<title>${label}</title><style>${css}</style>` +
        `${shadows}${glows}${fills}</svg>`
    )
}