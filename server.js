const http = require("http");
const fs = require("fs");

class HttpServer {
    constructor(port) {
        this.port = port || 3000;
        this.server = http.createServer((req, res) => {
            console.log("Route:", req.url);
            switch (req.url) {
            case "/":
                res.writeHead(200, {"Content-Type": "text/html"});
                fs.readFile("./index.html", (err, content) => {
                    if (err) throw err;
                    res.write(content);
                    res.end();
                })
                break;

            case "/styles.css":
                res.writeHead(200, {"Content-Type": "text/css"});
                fs.readFile("./styles.css", (err, content) => {
                    if (err) throw err;
                    res.write(content);
                    res.end();
                })
                break;

            case "/script.js":
                res.writeHead(200, {"Content-Type": "text/javascript"});
                fs.readFile("./script.js", (err, content) => {
                    if (err) throw err;
                    res.write(content);
                    res.end();
                })
                break;

            default:
                res.writeHead(404);
                res.write("Unknown route");
                res.end();
            }
        })
    }

    start() {
        this.server.listen(this.port, "0.0.0.0", () => console.log(`Listening on 0.0.0.0:${this.port}`));
    }
}

module.exports = {HttpServer};