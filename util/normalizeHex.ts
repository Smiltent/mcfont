
export default function normalizeHex(hex: string) {
    let a = hex.slice(1).toLowerCase()
    
    if (a.length === 3) {
        a = [...a].map((c) => c + c).join("")
    }

    return "#" + a
}