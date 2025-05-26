const API = '/api';

export async function fetchItems(offset, limit, search) {
  const qs = new URLSearchParams({ offset, limit, search });
  const res = await fetch(`${API}/items?${qs}`);
  return res.json(); // { items, hasMore }
}

export async function fetchSelected() {
  const res = await fetch(`${API}/items/selected`);
  return res.json(); // { selected: [id,…] }
}

export async function selectItem(id, selected) {
  await fetch(`${API}/items/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, selected }),
  });
}

export async function reorderItems(from, to) {
  await fetch(`${API}/items/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to }),
  });
}
