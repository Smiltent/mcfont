

// https://github.com/cprosche/mulberry32
export function rng(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0

        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export function hash(str: string) {
    let h = 2166136261

    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 16777619)
    }

    return h >>> 0
}