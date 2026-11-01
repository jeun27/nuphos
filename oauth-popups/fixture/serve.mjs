// node serve.mjs <port>: site on localhost:<port>, auth on 127.0.0.1:<port+1>.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
const dir = new URL('.', import.meta.url).pathname
const port = Number(process.argv[2] ?? 4801)
const page = (f) => readFileSync(dir + f)
createServer((q, r) => {
  const f = q.url.startsWith('/docs') ? 'docs.html' : 'site.html'
  r.writeHead(200, { 'content-type': 'text/html', 'cross-origin-opener-policy': 'same-origin-allow-popups' }); r.end(page(f))
}).listen(port, 'localhost')
createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(page('auth.html')) }).listen(port + 1, '127.0.0.1')
console.log('fixture up', port)
