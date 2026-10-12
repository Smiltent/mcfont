
import fontkit from "fontkit"
import path from "node:path"
import fs from "node:fs"

const load = (file: string) => fontkit.create(fs.readFileSync(path.join(process.cwd(), "public", "fonts", file)))

const FONTS = { reg: load("Minecraft.woff2"), bold: load("MinecraftBold.woff2")}
const FALLBACK = 6

const cache = { reg: new Map<number, number>(), bold: new Map<number, number>() }
 
export default function glyphWidth(cp: number, bold: boolean = false) {
    const key = bold ? "bold" : "reg"
    const hit = cache[key].get(cp)
    if (hit !== undefined) return hit

    const font = FONTS[key]
    const width = font.hasGlyphForCodePoint(cp)
        ? Math.round(font.glyphForCodePoint(cp).advanceWidth / (font.unitsPerEm / 12))
        : FALLBACK

    return width
}