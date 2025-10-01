'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-collections';
import { ModelLibraryDevice } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable row component
function SortableRow({ device }: { device: ModelLibraryDevice }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: device.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 ${isDragging ? 'bg-blue-50' : ''}`}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
          </svg>
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {device.specifications?.deviceId || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {device.manufacturer}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">{device.model}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {device.storageVariant || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            device.platform === 'Apple'
              ? 'bg-gray-200 text-gray-800'
              : 'bg-green-200 text-green-800'
          }`}
        >
          {device.platform}
        </span>
      </td>
    </tr>
  );
}

export default function ModelLibraryPage() {
  const [devices, setDevices] = useState<ModelLibraryDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'Android' | 'Apple'>('all');
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.MODEL_LIBRARY));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ModelLibraryDevice[];

      // Sort by sortOrder
      data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      setDevices(data);
    } catch (error) {
      console.error('Error loading model library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredDevices.findIndex((d) => d.id === active.id);
    const newIndex = filteredDevices.findIndex((d) => d.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedDevices = arrayMove(filteredDevices, oldIndex, newIndex);

    // Update sortOrder for reordered devices
    const updatedDevices = reorderedDevices.map((device, index) => ({
      ...device,
      sortOrder: index,
    }));

    // Optimistically update UI
    setDevices((prev) => {
      const updated = [...prev];
      updatedDevices.forEach((updatedDevice) => {
        const idx = updated.findIndex((d) => d.id === updatedDevice.id);
        if (idx !== -1) {
          updated[idx] = updatedDevice;
        }
      });
      return updated;
    });

    // Save to backend
    setSaving(true);
    try {
      await fetch('/api/model-library/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: updatedDevices.map((d) => ({ id: d.id, sortOrder: d.sortOrder })),
        }),
      });
    } catch (error) {
      console.error('Error saving order:', error);
      // Reload to restore correct order
      await loadDevices();
    } finally {
      setSaving(false);
    }
  };

  const filteredDevices = devices.filter((device) => {
    if (platformFilter !== 'all' && device.platform !== platformFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        device.manufacturer?.toLowerCase().includes(search) ||
        device.model?.toLowerCase().includes(search) ||
        device.storageVariant?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Model Library</h1>
        {saving && (
          <div className="text-sm text-blue-600 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving order...
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Models</div>
          <div className="text-2xl font-bold">{devices.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Android Models</div>
          <div className="text-2xl font-bold">
            {devices.filter((d) => d.platform === 'Android').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Apple Models</div>
          <div className="text-2xl font-bold">
            {devices.filter((d) => d.platform === 'Apple').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by manufacturer, model, or storage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="all">All</option>
              <option value="Android">Android</option>
              <option value="Apple">Apple</option>
            </select>
          </div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  {/* Drag handle */}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Device ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Manufacturer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Storage Variant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Platform
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <SortableContext
                items={filteredDevices.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredDevices.map((device) => (
                  <SortableRow key={device.id} device={device} />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
        {filteredDevices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {devices.length === 0
              ? 'No devices in library. Upload a Model Library file to get started.'
              : 'No devices match your search criteria.'}
          </div>
        )}
      </div>
    </div>
  );
}
