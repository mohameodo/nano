import { printExplorerHint, runPnpm } from './platform.mjs'

printExplorerHint('iOS')
runPnpm(['exec', 'rspeedy', 'dev'])
