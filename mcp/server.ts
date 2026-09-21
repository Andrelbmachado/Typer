import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createTyperMcpServer } from '../src/server/mcpTools'
import { projectsRoot } from './projectFiles'

void serveStdio(() => createTyperMcpServer())
console.error(`Typer MCP pronto em stdio. Projetos: ${projectsRoot}`)
