# Added memory multi-select and batch delete

- Added select mode for memories (toggle with "Select" button)
- Click individual memories to select/deselect in select mode
- "Delete (N)" button appears in toolbar when items are selected
- Cancel button exits select mode
- Added `.cp-item.selected` and `.cp-item-cb` CSS classes

## Files modified
- `src/components/views/CustomizeView.tsx` — added select mode state, batch delete handler, select UI
- `src/styles/components/home.css` — added selected and checkbox styling
