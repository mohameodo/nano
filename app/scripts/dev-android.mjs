import { printExplorerHint, runPnpm } from './platform.mjs'

printExplorerHint('Android')
runPnpm(['exec', 'rspeedy', 'dev'])
