# Fixed "memoryies" spelling in Memories section

- Fixed `memory{...'ies'}` to properly show `memory` / `memories` in CustomizeView
- The old logic appended "ies" to "memory" producing "memoryies"

## Files modified
- `src/components/views/CustomizeView.tsx` — corrected pluralization
