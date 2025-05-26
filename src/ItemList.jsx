import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchItems, fetchSelected, selectItem, reorderItems } from './api';

const PAGE_SIZE = 20;

function SortableItem({ item, onSelect }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                margin: '4px 0',
                background: isDragging ? '#e0e0e0' : '#fafafa',
                cursor: isDragging ? 'grabbing' : 'grab',
                transform: CSS.Transform.toString(transform),
                transition,
                zIndex: isDragging ? 1 : 0,
            }}
        >
            <input
                type="checkbox"
                checked={item.selected}
                onChange={(e) => {
                    e.stopPropagation();
                    onSelect(item.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
            />
            <span style={{ marginLeft: 8 }}>{item.value}</span>
        </div>
    );
}

export default function ItemList() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    const offsetRef = useRef(0);
    const loadingRef = useRef(false);
    const containerRef = useRef(null);
    const sentinelRef = useRef(null);
    const selectedIdsRef = useRef(new Set());
    const itemsRef = useRef(items);

    useEffect(() => { itemsRef.current = items; }, [items]);

    const loadPage = useCallback(async (reset = false) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);

        if (reset) {
            offsetRef.current = 0;
            setItems([]);
            setHasMore(true);
        }

        try {
            const { items: newItems, hasMore: more } = await fetchItems(
                offsetRef.current,
                PAGE_SIZE,
                search
            );

            const updatedItems = newItems.map(item => ({
                ...item,
                selected: selectedIdsRef.current.has(item.id),
            }));

            setItems(prev => (reset ? updatedItems : [...prev, ...updatedItems]));
            offsetRef.current += updatedItems.length;
            setHasMore(more);
        } catch (error) {
            console.error('Error loading items:', error);
        } finally {
            setLoading(false);
            loadingRef.current = false;
            if (initialLoad) setInitialLoad(false);
        }
    }, [search, initialLoad]);

    useEffect(() => {
        const initialize = async () => {
            try {
                const { selected } = await fetchSelected();
                selectedIdsRef.current = new Set(selected);
                await loadPage(true);
            } catch (error) {
                console.error('Error initializing:', error);
                await loadPage(true);
            }
        };
        initialize();
    }, [loadPage]);

    useEffect(() => {
        if (!initialLoad) {
            loadPage(true);
        }
    }, [search, loadPage, initialLoad]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMore && !loading) {
                    loadPage(false);
                }
            },
            { root: containerRef.current, rootMargin: '200px' }
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadPage, loading]);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        },
    }));

    const handleDragEnd = useCallback(async ({ active, over }) => {
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const fromGlobal = items[oldIndex].globalIndex;
        const toGlobal = items[newIndex].globalIndex;

        setItems(prev => arrayMove(prev, oldIndex, newIndex));

        try {
            await reorderItems(fromGlobal, toGlobal);
        } catch (error) {
            console.error('Error reordering items:', error);
            setItems([...items]);
        }
    }, [items]);

    const handleSelect = useCallback(async (id, selected) => {
        setItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, selected } : item
            )
        );

        if (selected) {
            selectedIdsRef.current.add(id);
        } else {
            selectedIdsRef.current.delete(id);
        }

        try {
            await selectItem(id, selected);
        } catch (error) {
            console.error('Error selecting item:', error);
            const wasSelected = selectedIdsRef.current.has(id);
            setItems(prev =>
                prev.map(item =>
                    item.id === id ? { ...item, selected: wasSelected } : item
                )
            );
        }
    }, []);

    return (
        <div style={{ width: 300, margin: '0 auto', marginTop: '20px' }}>
            <input
                type="text"
                placeholder="Поиск"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: 8, boxSizing: 'border-box', borderRadius: '12px', border: '1px solid gray' }}
            />

            <div
                ref={containerRef}
                style={{
                    height: 400,
                    overflowY: 'auto',
                    border: '1px solid gray',
                    marginTop: 8,
                    padding: 8,
                    borderRadius: '12px'
                }}
            >
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {items.map(item => (
                            <SortableItem
                                key={item.id}
                                item={item}
                                onSelect={handleSelect}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {loading && (
                    <div style={{ textAlign: 'center', padding: 8 }}>Загрузка</div>
                )}
                <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
        </div>
    );
}