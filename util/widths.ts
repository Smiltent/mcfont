
const N: Record<number, number> = { 1:1 }

export default function glyphWidth(cp: number, bold: boolean = false) {
    return (N[cp] ?? 6) + (bold ? 1 : 0)
}