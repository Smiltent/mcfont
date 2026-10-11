
import { serveStatic } from "@hono/node-server/serve-static"
import { serve } from "@hono/node-server"
import path from "node:path"
import { Hono } from "hono"
import ejs from "ejs"

import apiRoute from "../routes/root.route.ts"

export default class Honoo {
    private app: Hono

    public static render(file: string, data: object = {}) {
        return ejs.renderFile(path.join(process.cwd(), "views", `${file}.ejs`), data)
    }

    constructor() {
        this.app = new Hono()
        this.public()
        this.routes()
        this.start()
    }

    private public() {
        this.app.use(
            "/public/*",
            serveStatic({
                root: "./public",
                rewriteRequestPath: (p) => p.replace(/^\/public/, "")
            })
        )
    }

    private routes() {
        this.app.route("/", apiRoute)
    }

    private start() {
        serve(this.app)
    }
}