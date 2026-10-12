
const colors = document.getElementById("colors")
const tools = document.getElementById("tools")
const input = document.getElementById("input")
const scale = document.getElementById("scale")

const imgOutput = document.getElementById("imgOutput")

const urlOutput = document.getElementById("outUrl")
const mdOutput = document.getElementById("outMd")
const HTMLOutput = document.getElementById("outHTML")

const PALLETE = {
    "0": "#000000", "1": "#0000aa", "2": "#00aa00", "3": "#00aaaa", "4": "#aa0000",
    "5": "#aa00aa", "6": "#ffaa00", "7": "#aaaaaa", "8": "#555555", "9": "#5555ff",
    "a": "#55ff55", "b": "#55ffff", "c": "#ff5555", "d": "#ff55ff", "e": "#ffff55",
    "f": "#ffffff"
}

const TOOLS = {
    "l": "bold", "o": "italic", "n": "underline", "m": "strikethrough",
    "k": "obfuscated", "s": "shadow", "g": "glow", "r": "reset"
};

function query(text) {
    const n = Number(scale.value) || 3
    return `${n !== 3 ? `scale=${n}&` : ""}i=${encodeURIComponent(text).replaceAll("(", "%28").replaceAll(")", "%29")}`
}

function update() {
    const q = query(input.value)
    const full = `${location.origin}/view?${q}`

    imgOutput.src = `/view?${q}`
    urlOutput.value = full
    mdOutput.value = `![MCFont.com](${full})`
    HTMLOutput.value = `<img src="${full.replaceAll("&", "&amp;")}" alt="MCFont.com">`
}

let timer
function schedule() {
    clearTimeout(timer)
    timer = setTimeout(update, 150)
}

function insert(code) {
    const { selectionStart: a, selectionEnd: b, value } = input
    const sel = value.slice(a, b)
    const text = sel ? code + sel + "&r" : code

    input.setRangeText(text, a, b, "end")
    input.focus()
    schedule()
}

for (const [key, hex] of Object.entries(PALLETE)) {
    const btn = document.createElement("button")

    btn.label = `&${key}`
    btn.dataset.code = `&${key}`
    btn.style.background = hex

    colors.append(btn)
}

for (const [key, text] of Object.entries(TOOLS)) {
    const btn = document.createElement("button")

    btn.innerText = text
    btn.dataset.code = `&${key}`

    tools.append(btn)
}

document.addEventListener("click", (e) => {
    const t = e.target.closest("button")
    if (!t) return

    if (t.dataset.code) insert(t.dataset.code)

    if (t.dataset.copy) {
        const field = document.getElementById(t.dataset.copy)
        navigator.clipboard?.writeText(field.value)

        const old = t.textContent
        t.textContent = "Copied!"

        setTimeout(() => {
            t.textContent = old
        }, 1000)
    }

    if (t.id === "bg") document.querySelector(".output").classList.toggle("dark")
})

for (const el of [input, scale]) {
    el.addEventListener("input", schedule)
}

for (const el of [urlOutput, mdOutput, HTMLOutput]) {
    el.addEventListener("focus", () => el.select())
}

update()