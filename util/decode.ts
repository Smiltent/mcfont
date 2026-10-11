
// decode %xx sequences w/o throwing errors
export default function decode(raw: string) {
    return raw
        .replaceAll("+", " ")
        .replace(/(%[0-9a-f]{2})+/gi, (m) => {
            try {
                return decodeURIComponent(m)
            } catch {
                return m
            }
        })
}