'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, Tabs, Tab, Chip } from '@heroui/react';
import { RefreshCw } from 'lucide-react';
import { EventsAPI } from '@/lib/api/events';
import { ScoutEvent, EventTeam, EventMatch } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<ScoutEvent | null>(null);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [matches, setMatches] = useState<EventMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    
    const loadEventData = async () => {
      try {
        const [eventData, teamsData, matchesData] = await Promise.all([
          EventsAPI.getAllEvents().then(events => events.find(e => e.id === eventId)),
          EventsAPI.getEventTeams(eventId),
          EventsAPI.getEventMatches(eventId),
        ]);

        if (!eventData) {
          toast({ title: 'Error', description: 'Event not found' });
          router.push('/events');
          return;
        }

        setEvent(eventData);
        setTeams(teamsData);
        setMatches(matchesData);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load event data' });
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [eventId, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Event not found</div>
      </div>
    );
  }

  const handleStartScouting = () => {
    if (event.sourceType === 'TBA') {
      router.push(`/scouting/tba/${eventId}`);
    } else {
      router.push(`/scouting/custom/${eventId}`);
    }
  };

  const handleStartPitScouting = () => {
    router.push(`/pit-scouting?eventId=${eventId}`);
  };

  const handleSyncTBA = async () => {
    if (!event || !event.tbaEventKey) {
      toast({ title: 'Error', description: 'Event key not found' });
      return;
    }

    setSyncing(true);
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
      
      // Reload event data
      const [eventData, teamsData, matchesData] = await Promise.all([
        EventsAPI.getAllEvents().then(events => events.find(e => e.id === eventId)),
        EventsAPI.getEventTeams(eventId),
        EventsAPI.getEventMatches(eventId),
      ]);

      setEvent(eventData);
      setTeams(teamsData);
      setMatches(matchesData);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to sync event data' 
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-google-sans font-extrabold mb-2">
              {event.name}
            </h1>
            <div className="flex items-center gap-4">
              <Chip 
                color={event.sourceType === 'TBA' ? 'primary' : 'secondary'}
                variant="flat"
              >
                {event.sourceType}
              </Chip>
              {event.sourceType === 'TBA' && (
                <Chip variant="flat" size="sm">
                  {event.tbaEventKey}
                </Chip>
              )}
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button
              color="primary"
              size="lg"
              onPress={handleStartScouting}
            >
              Start Scouting
            </Button>
            <Button
              color="secondary"
              size="lg"
              onPress={handleStartPitScouting}
            >
              Pit Scouting
            </Button>
            {event.sourceType === 'TBA' && (
              <Button
                color="warning"
                size="lg"
                onPress={handleSyncTBA}
                isLoading={syncing}
                startContent={<RefreshCw className="w-4 h-4" />}
              >
                Sync TBA Data
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Card>
        <Tabs>
          <Tab key="overview" title="Overview">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{teams.length}</div>
                  <div className="text-gray-600">Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{matches.length}</div>
                  <div className="text-gray-600">Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {event.sourceType === 'TBA' ? 'Synced' : 'Manual'}
                  </div>
                  <div className="text-gray-600">Data Source</div>
                </div>
              </div>
            </div>
          </Tab>

          <Tab key="teams" title={`Teams (${teams.length})`}>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="p-4 border rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <div className="text-xl font-bold">{team.teamNumber}</div>
                    <div className="text-sm text-gray-600 truncate">
                      {team.team?.name || 'Team ' + team.teamNumber}
                    </div>
                    <Chip size="sm" variant="flat" className="mt-2">
                      {team.source}
                    </Chip>
                  </div>
                ))}
              </div>
            </div>
          </Tab>

          <Tab key="matches" title={`Matches (${matches.length})`}>
            <div className="p-6">
              <div className="space-y-2">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="font-semibold">
                        {match.displayName}
                      </div>
                      {match.tbaMatch && (
                        <div className="flex gap-2 text-sm">
                          <Chip size="sm" variant="flat">
                            {match.tbaMatch.matchType}
                          </Chip>
                          <span className="text-gray-600">
                            R: {match.tbaMatch.redAlliance?.join(', ')} vs B: {match.tbaMatch.blueAlliance?.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <Chip size="sm" variant="flat">
                      {match.source}
                    </Chip>
                  </div>
                ))}
              </div>
            </div>
          </Tab>
        </Tabs>
      </Card>
    </div>
  );
}
