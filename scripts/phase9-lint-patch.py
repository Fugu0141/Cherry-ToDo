from pathlib import Path

path = Path('src/adapters/migration/v1/index.ts')
text = path.read_text()
text = text.replace('  type FlowEdgeId,\n', '', 1)
text = text.replace('  input: string | unknown,\n', '  input: unknown,\n', 1)
path.write_text(text)
