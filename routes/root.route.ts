
import Honoo from "../src/Hono.ts"
import { Hono } from "hono"

const api = new Hono()

api.get("/", async (c) => {
    return c.html(await Honoo.render("index", { test: "test" }))
})

export default api