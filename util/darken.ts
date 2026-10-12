
// minecrafts shadow outline, aka 25% brightness of the color
export default function darken(hex: string) {
    const n = parseInt(hex.slice(1), 16)
    const char = (s: number) =>
        Math.round(((n >> s) & 255) * 0.25).toString(16).padStart(2, "0")

    return `#${char(16)}${char(8)}${char(0)}`
}