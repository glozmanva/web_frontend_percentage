import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { generateApi } from 'swagger-typescript-api'

// The unchanged documentation file comes from LR4. LR6 generates only services.
const swagger = JSON.parse(await readFile(resolve('openapi/swagger.json'), 'utf8'))
const paths = Object.fromEntries(Object.entries(swagger.paths).filter(([path]) => path.startsWith('/deposit-months')))
const operations = Object.values(paths).flatMap(item => Object.entries(item)
  .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method)))
if (operations.length !== 7) throw new Error(`LR6 requires 7 service methods; found ${operations.length}`)

// Keep only interfaces referenced by these methods, including nested references.
const definitions = {}
function collectDefinitions(value) {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string' && child.startsWith('#/definitions/')) {
      const name = child.slice('#/definitions/'.length)
      if (!(name in definitions)) {
        if (!swagger.definitions[name]) throw new Error(`Missing Swagger definition: ${name}`)
        definitions[name] = swagger.definitions[name]
        collectDefinitions(definitions[name])
      }
    } else collectDefinitions(child)
  }
}
collectDefinitions(paths)

await generateApi({
  name: 'Api.ts',
  output: resolve('src/api/generated'),
  spec: { ...swagger, paths, definitions },
  httpClientType: 'axios',
  generateClient: true,
  silent: true,
})
console.log('Generated 7 deposit month methods and their interfaces (Axios).')
