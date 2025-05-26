import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const TOTAL = 1000000;
const PAGE_SIZE = 20;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let orderedIds = Array.from({ length: TOTAL }, (_, i) => i + 1);
let selectedSet = new Set();

app.get('/api/items', (req, res) => {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || PAGE_SIZE;
    const search = (req.query.search || '').toString();

    const filtered = search
        ? orderedIds.filter(id => id.toString().includes(search))
        : orderedIds;

    const slice = filtered.slice(offset, offset + limit);
    const items = slice.map(id => ({
        id,
        value: id,
        selected: selectedSet.has(id),
        globalIndex: orderedIds.indexOf(id),
    }));

    res.json({ items, hasMore: offset + slice.length < filtered.length });
});

app.get('/api/items/selected', (req, res) => {
    res.json({ selected: Array.from(selectedSet) });
});

app.post('/api/items/select', (req, res) => {
    const { id, selected } = req.body;
    if (selected) selectedSet.add(id);
    else selectedSet.delete(id);
    res.sendStatus(200);
});

app.post('/api/items/reorder', (req, res) => {
    const { from, to } = req.body;
    if (
        typeof from !== 'number' ||
        typeof to !== 'number' ||
        from < 0 || to < 0 ||
        from >= orderedIds.length ||
        to > orderedIds.length
    ) return res.status(400).json({ error: 'Invalid indices' });

    const [moved] = orderedIds.splice(from, 1);
    orderedIds.splice(to, 0, moved);
    res.sendStatus(200);
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', '../dist/index.html'));
});

app.listen(4000, () => console.log('Server listening on http://localhost:4000'));
