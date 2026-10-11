
// honestly, could of used a base64 library. eh
export default function encodeb64(b: Uint8Array) {
    let binary = ""

    for (const byte of b) {
        binary += String.fromCharCode(byte)
    }

    return btoa(binary)
}