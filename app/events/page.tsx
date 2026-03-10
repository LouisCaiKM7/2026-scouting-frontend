'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Chip, Input } from '@heroui/react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { EventsAPI } from '@/lib/api/events';
import { ScoutEvent } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<ScoutEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingEventId, setSyncingEventId] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await EventsAPI.getAllEvents();
        setEvents(eventsData);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load events' });
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.tbaEventKey && event.tbaEventKey.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSyncTBA = async (event: ScoutEvent) => {
    if (!event.tbaEventKey) {
      toast({ title: 'Error', description: 'Event key not found' });
      return;
    }

    setSyncingEventId(event.id);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tba/sync/${event.tbaEventKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to sync event data');
      }

      toast({ 
        title: 'Success', 
        description: `Successfully synced ${event.name}` 
      });
      
      // Reload events to get updated data
      const eventsData = await EventsAPI.getAllEvents();
      setEvents(eventsData);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to sync event data' 
      });
    } finally {
      setSyncingEventId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-google-sans font-extrabold mb-2">
            Events
          </h1>
          <p className="text-gray-600">Manage your scouting events</p>
        </div>
        
        <Button
          color="primary"
          size="lg"
          startContent={<Plus />}
          onPress={() => router.push('/events/create')}
        >
          Create Event
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search events..."
          startContent={<Search />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 line-clamp-2">
                      {event.name}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      <Chip
                        color={event.sourceType === 'TBA' ? 'primary' : 'secondary'}
                        variant="flat"
                        size="sm"
                      >
                        {event.sourceType}
                      </Chip>
                      {event.tbaEventKey && (
                        <Chip variant="flat" size="sm">
                          {event.tbaEventKey}
                        </Chip>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div>Created: {new Date(event.createdAt).toLocaleDateString()}</div>
                  <div>Updated: {new Date(event.updatedAt).toLocaleDateString()}</div>
                  {event.sourceType === 'TBA' && event.syncEnabled && (
                    <div className="text-green-600">
                      Sync: {event.lastSyncedAt ? 
                        `Last: ${new Date(event.lastSyncedAt).toLocaleDateString()}` : 
                        'Not synced yet'
                      }
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  {event.sourceType === 'TBA' && (
                    <Button
                      size="sm"
                      color="secondary"
                      variant="flat"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSyncTBA(event);
                      }}
                      isLoading={syncingEventId === event.id}
                      startContent={<RefreshCw className="w-4 h-4" />}
                    >
                      Sync
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {searchTerm ? 'No events found matching your search.' : 'No events created yet.'}
          </div>
          {!searchTerm && (
            <Button
              color="primary"
              onPress={() => router.push('/events/create')}
            >
              Create Your First Event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

