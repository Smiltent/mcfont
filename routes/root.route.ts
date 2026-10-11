
import decode from "../util/decode.ts"
import Honoo from "../src/Hono.ts"
import { Hono } from "hono"
import { renderSvg } from "../src/Renderer.ts";

const api = new Hono()
const MAX = 2000

api.get("/", async (c) => {
    return c.html(await Honoo.render("index", { test: "test" }))
})

api.get("/view", (c) => {
    const query = new URL(c.req.url).search.slice(1)
    const m = /(?:^|&)i=/.exec(query)

    const params = new URLSearchParams(m ? query.slice(0, m.index) : query)
    const text = m ? decode(query.slice(m.index + m[0].length)).slice(0, MAX) : ""

    const svg = renderSvg(text || "Missing 'i' paramater", { scale: Number(params.get("scale")) || 3})

    return c.body(svg, 200, {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
    })
})

export default api