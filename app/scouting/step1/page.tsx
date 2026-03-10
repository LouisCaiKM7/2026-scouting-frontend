'use client';

import { useForm } from "@/app/scouting/contexts/FormContent";
import { useRouter } from "next/navigation";
import { Input, Button, Card, Select, SelectItem } from "@heroui/react";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { EventsAPI } from "@/lib/api/events";

enum MatchType {
  QUAL = 'Qualification',
  PRAC = 'Practice',
  MATCH = 'Match',
  FINAL = 'Final',
}

enum Alliance {
  RED = 'Red',
  BLUE = 'Blue',
}

export default function Step1() {
  // @ts-ignore
  const { formData, setFormData } = useForm();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [matchesLoading, setMatchesLoading] = useState<boolean>(false);

  // Get current event from events array
  const currentEvent = events.find(e => e.id === selectedEventId);

  useEffect(() => {
    const urlEventId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('eventId')
      : null;
    if (urlEventId) {
      setSelectedEventId(urlEventId);
      setFormData((prev) => ({ ...prev, eventId: urlEventId }));
    }
  }, [setFormData]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        const all = await EventsAPI.getAllEvents();
        setEvents(all);

        // If no event is preselected (URL or previous state), default to the newest one.
        if (!selectedEventId && all.length > 0) {
          setSelectedEventId(all[0].id);
          setFormData((prev) => ({ ...prev, eventId: all[0].id }));
        }
      } catch (e) {
        console.error('Failed to load events:', e);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Load matches/teams whenever event changes (step1 should not depend on sessionStorage)
  useEffect(() => {
    if (!selectedEventId) {
      setMatches([]);
      setTeams([]);
      setMatchesLoading(false);
      return;
    }

    // Clear previous data immediately when event changes and set loading
    setMatches([]);
    setTeams([]);
    setMatchesLoading(true);

    const load = async () => {
      try {
        const [eventTeams, eventMatches] = await Promise.all([
          EventsAPI.getEventTeams(selectedEventId),
          EventsAPI.getEventMatches(selectedEventId),
        ]);

        setTeams(Array.isArray(eventTeams) ? eventTeams : []);
        setMatches(Array.isArray(eventMatches) ? eventMatches : []);
      } catch (e) {
        console.error('Failed to load event teams/matches:', e);
        setTeams([]);
        setMatches([]);
      } finally {
        setMatchesLoading(false);
      }
    };

    load();
  }, [selectedEventId]);

  const handleNext = () => {
    // Validation for required fields
    if (!formData.matchNumber && currentEvent?.sourceType === 'CUSTOM') {
      alert('Please enter a match number');
      return;
    }
    
    if (!formData.team) {
      alert('Please select a team');
      return;
    }
    
    if (!formData.alliance) {
      alert('Please select an alliance');
      return;
    }
    
    if (!formData.matchType || !formData.matchNumber || !formData.team) {
      toast({ title: 'Error', description: 'Please fill in all required fields' });
      return;
    }
    router.push("/scouting/step3");
  };

  const handleGoBack = () => {
    if (selectedEventId) {
      router.push(`/events/${selectedEventId}`);
      return;
    }
    router.push('/events');
  };

  const handleTextOrNumberInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: field === 'matchNumber' || field === 'team' ? Number(value) : value,
    });
  };

  const handleMatchTypeChange = (keys: any) => {
    const key = Array.from(keys)[0] as string | undefined;
    setFormData((prev) => ({
      ...prev,
      matchType: key || '',
      matchNumber: 0,
      team: 0,
      alliance: '',
    }));
  };

  const handleMatchNumberChange = (keys: any) => {
    const key = Array.from(keys)[0] as string | undefined;
    const selected = key ? matches.find((m) => m.id === key) : undefined;
    setFormData((prev) => ({
      ...prev,
      eventMatchId: key || '',
      matchNumber: selected?.matchNumber || 0,
    }));
  };

  const handleTeamChange = (keys: any) => {
    const key = Array.from(keys)[0] as string | undefined;
    const teamNumber = key ? Number(key) : 0;

    // Auto-select alliance based on team's actual alliance in the match
    let alliance = '';
    if (teamNumber && selectedMatch?.tbaMatch) {
      const redAlliance = selectedMatch.tbaMatch.redAlliance || [];
      const blueAlliance = selectedMatch.tbaMatch.blueAlliance || [];
      if (redAlliance.includes(teamNumber)) {
        alliance = Alliance.RED;
      } else if (blueAlliance.includes(teamNumber)) {
        alliance = Alliance.BLUE;
      }
    }

    setFormData((prev) => ({
      ...prev,
      team: teamNumber,
      alliance: alliance,
    }));
  };

  // Filter matches based on selected matchType
  const filteredMatches = matches.filter((match) => {
    if (!formData.matchType) return true;
    const compLevel = match.compLevel?.toLowerCase() || '';
    const matchType = formData.matchType.toLowerCase();
    
    // Map matchType to compLevel
    if (matchType === 'qualification') return compLevel === 'qualification' || compLevel === 'qm';
    if (matchType === 'practice') return compLevel === 'practice' || compLevel === 'pr';
    if (matchType === 'final') return compLevel === 'final' || compLevel === 'f';
    if (matchType === 'match') return true; // Match type shows all
    return true;
  });

  // Get teams from selected match's alliances
  const selectedMatch = matches.find((m) => m.id === formData.eventMatchId);
  const matchTeams = selectedMatch?.tbaMatch 
    ? [...(selectedMatch.tbaMatch.redAlliance || []), ...(selectedMatch.tbaMatch.blueAlliance || [])]
    : [];

  return (
    <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-7xl min-h-screen">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl font-google-sans font-extrabold mb-3">
          Match Information
        </h1>
        <div className="h-1 w-16 bg-primary mx-auto rounded-full"/>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <section className="w-full lg:w-1/2 space-y-6 sm:space-y-8">
          <Card className="p-4 sm:p-8 backdrop-blur-md hover:shadow-xl transition-shadow duration-300 border-1 border-black dark:border-white">
            <div className="space-y-6 sm:space-y-8">
              <div>
                <label className="text-lg sm:text-xl text-default-600 block font-google-sans font-extrabold pb-2">
                  Event
                </label>
                <Select
                  label="Event"
                  placeholder="Select event"
                  selectedKeys={selectedEventId ? new Set([selectedEventId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const id = Array.from(keys)[0] as string;
                    setSelectedEventId(id);
                    setFormData((prev) => ({ ...prev, eventId: id, eventMatchId: '', team: 0, matchNumber: 0, alliance: '' }));
                  }}
                  isRequired
                >
                  {events.map((ev) => (
                    <SelectItem key={ev.id} textValue={ev.name}>
                      <div className="flex flex-col">
                        <div className="font-semibold">{ev.name}</div>
                        <div className="text-sm text-gray-600">{ev.sourceType}{ev.tbaEventKey ? ` • ${ev.tbaEventKey}` : ''}</div>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-lg sm:text-xl text-default-600 block font-google-sans font-extrabold pb-2">
                  Match Type
                </label>
                <Select
                  label="Match Type"
                  selectedKeys={formData.matchType ? new Set([formData.matchType]) : new Set()}
                  onSelectionChange={handleMatchTypeChange}
                  isRequired
                >
                  <SelectItem key={MatchType.QUAL}>{MatchType.QUAL}</SelectItem>
                  <SelectItem key={MatchType.PRAC}>{MatchType.PRAC}</SelectItem>
                  <SelectItem key={MatchType.MATCH}>{MatchType.MATCH}</SelectItem>
                  <SelectItem key={MatchType.FINAL}>{MatchType.FINAL}</SelectItem>
                </Select>
              </div>
            </div>
          </Card>
        </section>

        <section className="w-full lg:w-1/2 space-y-6 sm:space-y-8">
          <Card className="h-full p-4 sm:p-8 backdrop-blur-md hover:shadow-xl transition-shadow duration-300 border-1 border-black dark:border-white">
            <div className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
                <div>
                  <label className="text-lg sm:text-xl text-default-600 block font-google-sans font-extrabold pb-2">
                    Match Number
                  </label>
                  {currentEvent?.sourceType === 'TBA' && !eventsLoading && !matchesLoading && formData.matchType !== MatchType.MATCH && formData.matchType !== MatchType.PRAC ? (
                    <Select
                      label="Match Number"
                      placeholder="Select match"
                      selectedKeys={formData.eventMatchId ? new Set([formData.eventMatchId]) : new Set()}
                      onSelectionChange={handleMatchNumberChange}
                      isRequired
                    >
                      {filteredMatches.map((match) => (
                        <SelectItem
                          key={match.id}
                          textValue={match.displayName}
                        >
                          {match.displayName}
                        </SelectItem>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      label="Match Number"
                      placeholder="Enter match number"
                      value={formData.matchNumber || ''}
                      onChange={(e) => handleTextOrNumberInputChange('matchNumber', e.target.value)}
                      min={0}
                      isRequired
                    />
                  )}
                </div>
                <div>
                  <label className="text-lg sm:text-xl text-default-600 block font-google-sans font-extrabold pb-2">
                    Team Number
                  </label>
                  {currentEvent?.sourceType === 'TBA' && !eventsLoading ? (
                    <Select
                      label="Team Number"
                      placeholder="Select team"
                      selectedKeys={formData.team ? new Set([String(formData.team)]) : new Set()}
                      onSelectionChange={handleTeamChange}
                      isRequired
                      isDisabled={!selectedMatch || matchTeams.length === 0}
                    >
                      {matchTeams.map((teamNumber) => (
                        <SelectItem key={String(teamNumber)} textValue={String(teamNumber)}>
                          <div className="flex flex-col">
                            <div className="font-semibold">Team {teamNumber}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      label="Team Number"
                      placeholder="Enter team number"
                      value={formData.team || ''}
                      onChange={(e) => handleTextOrNumberInputChange('team', e.target.value)}
                      min={1}
                      isRequired
                    />
                  )}
                </div>
              </div>
              
              {/* Alliance Selection */}
              <div className="mt-4">
                <label className="text-lg sm:text-xl text-default-600 block font-google-sans font-extrabold pb-2">
                  Alliance {currentEvent?.sourceType === 'TBA' ? '(Auto-selected)' : ''}
                </label>
                {currentEvent?.sourceType === 'TBA' ? (
                  <div className="flex gap-2">
                    <div className={`px-4 py-2 rounded-lg ${formData.alliance === Alliance.RED ? 'bg-red-500 text-white' : 'bg-red-200'}`}>
                      Red Alliance
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${formData.alliance === Alliance.BLUE ? 'bg-blue-500 text-white' : 'bg-blue-200'}`}>
                      Blue Alliance
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      className={`px-6 py-6 rounded-lg font-bold text-xl transition-all ${formData.alliance === Alliance.RED ? 'bg-red-500 text-white' : 'border-3 border-red-500 hover:bg-red-500 hover:text-white'}`}
                      onClick={() => setFormData(prev => ({ ...prev, alliance: Alliance.RED }))}
                    >
                      Red Alliance
                    </button>
                    <button
                      type="button"
                      className={`px-6 py-6 rounded-lg font-bold text-xl transition-all ${formData.alliance === Alliance.BLUE ? 'bg-blue-500 text-white' : 'border-3 border-blue-500 hover:bg-blue-500 hover:text-white'}`}
                      onClick={() => setFormData(prev => ({ ...prev, alliance: Alliance.BLUE }))}
                    >
                      Blue Alliance
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex-1 px-6 sm:px-8 py-6 sm:py-8 rounded-lg border-3 border-gray-300 bg-transparent hover:bg-gray-100 font-google-sans text-xl sm:text-2xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 px-6 sm:px-8 py-6 sm:py-8 rounded-lg bg-black-500 text-white shadow-lg font-google-sans text-xl sm:text-2xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Next
                </button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
