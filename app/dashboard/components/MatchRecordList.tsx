'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from "@heroui/react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { calculateAutoScore, calculateTeleopScore, calculateEndGameScore } from '@/app/lib/utils';
import { toast } from "@/hooks/use-toast";
import { getCookie } from 'cookies-next/client';

interface MatchRecord {
  id: string;
  team: number;
  matchType: string;
  matchNumber: number;
  alliance: string;
  autonomous: {
    autoStart: number;
    leftStartingZone: boolean;
    fuelCount: number;
    isTowerSuccess: boolean;
  };
  teleop: {
    fuelCount: number;
    humanFuelCount: number;
    passBump: boolean;
    passTrench: boolean;
    fetchBallPreference: string;
  };
  endAndAfterGame: {
    towerStatus: string;
    comments: string;
    climbingTime: number;
    rankingPoint: number;
    coopPoint: boolean;
    autonomousMove: boolean;
    teleopMove: boolean;
  };
}

interface GroupedMatchRecord {
  matchNumber: number;
  matchType: string;
  teams: {
    id: string;
    team: number;
    alliance: string;
    autonomous: MatchRecord['autonomous'];
    teleop: MatchRecord['teleop'];
    endAndAfterGame: MatchRecord['endAndAfterGame'];
  }[];
}

function calculateMatchStats(teams) {
  let totalAutoScore = 0, totalTeleopScore = 0, totalEndGameScore = 0;
  teams.forEach(team => {
    totalAutoScore += calculateAutoScore(team.autonomous);
    totalTeleopScore += calculateTeleopScore(team.teleop);
    totalEndGameScore += calculateEndGameScore(team.endAndAfterGame?.towerStatus);
  });
  return {
    totalAutoScore,
    totalTeleopScore,
    totalEndGameScore,
    avgAutoScore: totalAutoScore / teams.length,
    avgTeleopScore: totalTeleopScore / teams.length,
    avgEndGameScore: totalEndGameScore / teams.length,
  };
}

function MatchStatsModal({ match, onClose }) {
  const stats = calculateMatchStats(match.teams);
  return (
    <div className="flex flex-col h-full">
      <ModalHeader className="border-b pb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold">Match {match.matchNumber} Statistics</h2>
          <Button color="primary" variant="light" size="sm" onPress={onClose}>Close</Button>
        </div>
      </ModalHeader>
      <ModalBody className="py-4 overflow-y-auto flex-grow">
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Avg Auto</p><p className="text-xl font-bold">{stats.avgAutoScore.toFixed(1)}</p></div>
            <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Avg Teleop</p><p className="text-xl font-bold">{stats.avgTeleopScore.toFixed(1)}</p></div>
            <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Avg EndGame</p><p className="text-xl font-bold">{stats.avgEndGameScore.toFixed(1)}</p></div>
          </div>
        </div>
      </ModalBody>
    </div>
  );
}

function TeamStatsModal({ team, matchNumber, onDelete }) {
  const autoScore = calculateAutoScore(team.autonomous);
  const teleopScore = calculateTeleopScore(team.teleop);
  const endGameScore = calculateEndGameScore(team.endAndAfterGame?.towerStatus);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTeam, setEditedTeam] = useState({ ...team });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMatchNumber, setDeleteMatchNumber] = useState("");

  const handleChange = (section, field, value) => {
    setEditedTeam(prev => {
      if (section === 'root') return { ...prev, [field]: value };
      return { ...prev, [section]: { ...prev[section], [field]: value } };
    });
  };

  const handleTowerStatusChange = (value: string) => {
    setEditedTeam(prev => ({
      ...prev,
      endAndAfterGame: {
        ...prev.endAndAfterGame,
        towerStatus: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/scouting/update/${editedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getCookie('Authorization')}` },
        body: JSON.stringify(editedTeam, (_, v) => v === '' ? 0 : v),
      });
      if (response.ok) {
        toast({ title: "Success", description: "Record updated successfully" });
        setIsEditing(false);
        window.location.reload();
      } else {
        const err = await response.json();
        toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not connect to server", variant: "destructive" });
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteMatchNumber !== matchNumber.toString()) {
      toast({ title: "Error", description: "Match number does not match", variant: "destructive" });
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/scouting/delete/${team.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getCookie('Authorization')}` },
      });
      if (response.ok) {
        toast({ title: "Success", description: "Record deleted" });
        setShowDeleteModal(false);
        if (onDelete) onDelete();
      } else {
        const err = await response.json();
        toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not connect to server", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="overflow-y-auto">
        <div className="flex justify-end mb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10 py-2 gap-2">
          {isEditing ? (
            <>
              <Button color="success" size="sm" onPress={handleSave}>Save</Button>
              <Button color="danger" size="sm" onPress={() => { setIsEditing(false); setEditedTeam({ ...team }); }}>Cancel</Button>
            </>
          ) : (
            <>
              <Button color="danger" size="sm" variant="light" startContent={<Trash2 className="w-4 h-4" />} onPress={() => setShowDeleteModal(true)}>Delete</Button>
              <Button color="primary" size="sm" onPress={() => setIsEditing(true)}>Edit</Button>
            </>
          )}
        </div>

        {/* Team & Match Number */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-default-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span>Team Number</span>
              {isEditing ? <input type="number" value={editedTeam.team ?? ''} onChange={(e) => handleChange('root', 'team', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-24 p-1 border rounded" /> : <span className="font-medium">{team.team}</span>}
            </div>
          </div>
          <div className="bg-default-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span>Match Number</span>
              {isEditing ? <input type="number" value={editedTeam.matchNumber ?? ''} onChange={(e) => handleChange('root', 'matchNumber', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-24 p-1 border rounded" /> : <span className="font-medium">{team.matchNumber}</span>}
            </div>
          </div>
        </div>

        {/* Autonomous */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-3">Autonomous</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Fuel Count</span>
                {isEditing ? <input type="number" min="0" value={editedTeam.autonomous?.fuelCount ?? ''} onChange={(e) => handleChange('autonomous', 'fuelCount', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-16 p-1 border rounded" /> : <span className="font-medium">{team.autonomous?.fuelCount || 0}</span>}
              </div>
            </div>
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Tower L1</span>
                {isEditing ? <input type="checkbox" checked={editedTeam.autonomous?.isTowerSuccess} onChange={(e) => handleChange('autonomous', 'isTowerSuccess', e.target.checked)} className="h-5 w-5" /> : <span className="font-medium">{team.autonomous?.isTowerSuccess ? "Yes" : "No"}</span>}
              </div>
            </div>
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Left Zone</span>
                {isEditing ? <input type="checkbox" checked={editedTeam.autonomous?.leftStartingZone} onChange={(e) => handleChange('autonomous', 'leftStartingZone', e.target.checked)} className="h-5 w-5" /> : <span className="font-medium">{team.autonomous?.leftStartingZone ? "Yes" : "No"}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Teleop */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-3">Teleop</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Fuel Count</span>
                {isEditing ? <input type="number" min="0" value={editedTeam.teleop?.fuelCount ?? ''} onChange={(e) => handleChange('teleop', 'fuelCount', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-16 p-1 border rounded" /> : <span className="font-medium">{team.teleop?.fuelCount || 0}</span>}
              </div>
            </div>
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Human Fuel</span>
                {isEditing ? <input type="number" min="0" value={editedTeam.teleop?.humanFuelCount ?? ''} onChange={(e) => handleChange('teleop', 'humanFuelCount', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-16 p-1 border rounded" /> : <span className="font-medium">{team.teleop?.humanFuelCount || 0}</span>}
              </div>
            </div>
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Pass Bump</span>
                {isEditing ? <input type="checkbox" checked={editedTeam.teleop?.passBump} onChange={(e) => handleChange('teleop', 'passBump', e.target.checked)} className="h-5 w-5" /> : <span className="font-medium">{team.teleop?.passBump ? "Yes" : "No"}</span>}
              </div>
            </div>
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Pass Trench</span>
                {isEditing ? <input type="checkbox" checked={editedTeam.teleop?.passTrench} onChange={(e) => handleChange('teleop', 'passTrench', e.target.checked)} className="h-5 w-5" /> : <span className="font-medium">{team.teleop?.passTrench ? "Yes" : "No"}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* End Game */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-3">End Game</h3>
          <div className="bg-default-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span>Tower Status</span>
              {isEditing ? (
                <select value={editedTeam.endAndAfterGame?.towerStatus || 'None'} onChange={(e) => handleTowerStatusChange(e.target.value)} className="p-1 border rounded bg-white dark:bg-zinc-800">
                  <option value="None">No Tower</option>
                  <option value="L1">L1 (10pts)</option>
                  <option value="L2">L2 (20pts)</option>
                  <option value="L3">L3 (30pts)</option>
                </select>
              ) : <span className="font-medium">{team.endAndAfterGame?.towerStatus || "None"}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Ranking Pts</span>
                {isEditing ? <input type="number" min="0" value={editedTeam.endAndAfterGame?.rankingPoint ?? ''} onChange={(e) => handleChange('endAndAfterGame', 'rankingPoint', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-16 p-1 border rounded" /> : <span className="font-medium">{team.endAndAfterGame?.rankingPoint || 0}</span>}
              </div>
            </div>
            <div className="bg-default-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Coop Point</span>
                {isEditing ? <input type="checkbox" checked={editedTeam.endAndAfterGame?.coopPoint} onChange={(e) => handleChange('endAndAfterGame', 'coopPoint', e.target.checked)} className="h-5 w-5" /> : <span className="font-medium">{team.endAndAfterGame?.coopPoint ? "Yes" : "No"}</span>}
              </div>
            </div>
          </div>
          <div className="mt-2 bg-default-50 p-3 rounded-lg">
            <span className="mb-2 block">Comments</span>
            {isEditing ? <textarea value={editedTeam.endAndAfterGame?.comments || ""} onChange={(e) => handleChange('endAndAfterGame', 'comments', e.target.value)} className="w-full p-2 border rounded min-h-[80px]" /> : <span className="font-medium">{team.endAndAfterGame?.comments || "No comments"}</span>}
          </div>
        </div>

        {/* Score Summary */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Score Summary</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-default-50 p-4 rounded-lg text-center"><p className="text-sm text-gray-600">Auto</p><p className="text-xl font-bold">{autoScore}</p></div>
            <div className="bg-default-50 p-4 rounded-lg text-center"><p className="text-sm text-gray-600">Teleop</p><p className="text-xl font-bold">{teleopScore}</p></div>
            <div className="bg-default-50 p-4 rounded-lg text-center"><p className="text-sm text-gray-600">EndGame</p><p className="text-xl font-bold">{endGameScore}</p></div>
            <div className="bg-default-50 p-4 rounded-lg text-center"><p className="text-sm text-gray-600">Total</p><p className="text-xl font-bold">{autoScore + teleopScore + endGameScore}</p></div>
          </div>
        </div>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm">
        <ModalContent className="max-w-md mx-auto">
          <ModalHeader className="text-center">Confirm Delete</ModalHeader>
          <ModalBody className="text-center">
            <p className="mb-4">Delete record for Team {team.team} in Match {matchNumber}?</p>
            <p className="mb-4 text-sm text-gray-600">Enter the match number to confirm.</p>
            <div className="flex justify-center">
              <Input type="number" label="Match Number" placeholder={`Enter ${matchNumber}`} value={deleteMatchNumber} onChange={(e) => setDeleteMatchNumber(e.target.value)} className="max-w-32" />
            </div>
          </ModalBody>
          <ModalFooter className="justify-center gap-2">
            <Button color="danger" size="sm" onPress={handleDeleteConfirm}>Delete</Button>
            <Button color="default" size="sm" onPress={() => setShowDeleteModal(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

const calculateAllianceScore = (teams) => {
  return teams.reduce((total, team) => {
    return total + calculateAutoScore(team.autonomous) + calculateTeleopScore(team.teleop) + calculateEndGameScore(team.endAndAfterGame?.towerStatus);
  }, 0);
};

export function MatchRecordList({ teamNumber, matchType }) {
  const [records, setRecords] = useState<GroupedMatchRecord[] | MatchRecord[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<GroupedMatchRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamStats, setShowTeamStats] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState<number[]>([]);

  useEffect(() => {
    const groupRecords = (data: MatchRecord[]) => {
      const grouped: Record<string, GroupedMatchRecord> = {};
      data.forEach(record => {
        const key = `${record.matchNumber}`;
        if (!grouped[key]) grouped[key] = { matchNumber: record.matchNumber, matchType: record.matchType, teams: [] };
        grouped[key].teams.push({ id: record.id, team: record.team, alliance: record.alliance, autonomous: record.autonomous, teleop: record.teleop, endAndAfterGame: record.endAndAfterGame });
      });
      return Object.values(grouped).sort((a, b) => a.matchNumber - b.matchNumber);
    };

    if (!teamNumber) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/scouting/teams`)
        .then(res => res.json())
        .then((data: MatchRecord[]) => setRecords(groupRecords(data)))
        .catch(err => console.error('Error:', err));
    } else {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/scouting/${teamNumber}/matches${matchType ? `?type=${matchType}` : ''}`)
        .then(res => res.json())
        .then((data: MatchRecord[]) => {
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/scouting/teams`)
            .then(res => res.json())
            .then((allRecords: MatchRecord[]) => {
              const matchNumbers = new Set(data?.map(r => r.matchNumber));
              setRecords(groupRecords(allRecords.filter(r => matchNumbers.has(r.matchNumber))));
            });
        })
        .catch(err => console.error('Error:', err));
    }
  }, [teamNumber, matchType]);

  const renderTeamDetails = (team, matchNumber) => {
    const autoScore = calculateAutoScore(team.autonomous);
    const teleopScore = calculateTeleopScore(team.teleop);
    const endGameScore = calculateEndGameScore(team.endAndAfterGame?.towerStatus);

    return (
      <div key={team.id} className="border-b last:border-b-0 py-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <h4 className="text-lg font-semibold">Team {team.team}</h4>
            <span className={`px-3 py-1 rounded-full ${team.alliance === 'Red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{team.alliance}</span>
          </div>
          <Button color="primary" variant="light" size="sm" onPress={() => { setSelectedTeam({ ...team, matchNumber }); setShowTeamStats(true); setShowStats(false); setIsModalOpen(true); }}>View Stats</Button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div><p className="text-sm text-gray-600">Auto</p><p className="font-medium">{autoScore}</p></div>
          <div><p className="text-sm text-gray-600">Teleop</p><p className="font-medium">{teleopScore}</p></div>
          <div><p className="text-sm text-gray-600">EndGame</p><p className="font-medium">{endGameScore}</p></div>
          <div><p className="text-sm text-gray-600">Total</p><p className="font-medium">{autoScore + teleopScore + endGameScore}</p></div>
        </div>
      </div>
    );
  };

  const toggleMatchExpand = (matchNumber: number) => {
    setExpandedMatches(prev => prev.includes(matchNumber) ? prev.filter(m => m !== matchNumber) : [...prev, matchNumber]);
  };

  return (
    <>
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Match Records</h2>
        <div className="space-y-4">
          {(records as GroupedMatchRecord[])
            .filter(match => !teamNumber || match.teams.some(t => t.team === teamNumber))
            .map((match) => (
              <div key={match.matchNumber} className="p-3 border rounded-lg bg-default-50 hover:bg-default-100 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                  <div className="flex items-center gap-2 cursor-pointer mb-2 sm:mb-0" onClick={() => toggleMatchExpand(match.matchNumber)}>
                    <h3 className="text-lg font-semibold">Match {match.matchNumber}</h3>
                    {expandedMatches.includes(match.matchNumber) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-row justify-between items-center gap-2 flex-wrap">
                    <div className="flex items-center">
                      <div className="flex items-center text-xs bg-red-100 dark:bg-red-900/30 px-1 py-0.5 rounded-md">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-0.5"></div>
                        <span className="font-medium">{calculateAllianceScore(match.teams.filter(t => t.alliance === 'Red'))}</span>
                      </div>
                      <span className="text-gray-500 mx-0.5">vs</span>
                      <div className="flex items-center text-xs bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded-md">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-0.5"></div>
                        <span className="font-medium">{calculateAllianceScore(match.teams.filter(t => t.alliance === 'Blue'))}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button color="primary" variant="light" size="sm" className="px-2 py-1 text-xs" onPress={() => { setSelectedMatch(match); setShowStats(true); setIsModalOpen(true); }}>Stats</Button>
                      <Button color="primary" variant="light" size="sm" className="px-2 py-1 text-xs" onPress={() => { setSelectedMatch(match); setShowStats(false); setIsModalOpen(true); }}>Details</Button>
                    </div>
                  </div>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ${expandedMatches.includes(match.matchNumber) ? 'max-h-[500px]' : 'max-h-0'}`}>
                  {teamNumber ? (
                    match.teams.filter(t => t.team === teamNumber).map(team => renderTeamDetails(team, match.matchNumber))
                  ) : (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <h4 className="text-sm font-semibold text-red-700 mb-2">Red Alliance</h4>
                        {match.teams.filter(t => t.alliance === 'Red').map(team => <div key={team.id} className="text-sm py-1">Team {team.team}</div>)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-blue-700 mb-2">Blue Alliance</h4>
                        {match.teams.filter(t => t.alliance === 'Blue').map(team => <div key={team.id} className="text-sm py-1">Team {team.team}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedMatch(null); setShowStats(false); setShowTeamStats(false); setSelectedTeam(null); }}
        size="full"
        scrollBehavior="inside"
        className="sm:!max-w-3xl"
      >
        <ModalContent className="p-0 h-[100vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
          {showStats && selectedMatch ? (
            <MatchStatsModal match={selectedMatch} onClose={() => { setShowStats(false); setIsModalOpen(false); }} />
          ) : showTeamStats && selectedTeam ? (
            <>
              <ModalHeader className="border-b pb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Team {selectedTeam.team} - Match {selectedTeam.matchNumber}</h2>
                  <Button color="primary" variant="light" size="sm" onPress={() => { setShowTeamStats(false); setIsModalOpen(false); }}>Close</Button>
                </div>
              </ModalHeader>
              <ModalBody className="py-4 overflow-y-auto flex-grow">
                <TeamStatsModal team={selectedTeam} matchNumber={selectedTeam.matchNumber} onDelete={() => { setSelectedTeam(null); setShowTeamStats(false); setIsModalOpen(false); window.location.reload(); }} />
              </ModalBody>
            </>
          ) : selectedMatch && selectedMatch.teams ? (
            <>
              <ModalHeader className="border-b pb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg sm:text-xl font-bold">Match {selectedMatch.matchNumber} Details</h2>
                  <Button color="primary" variant="light" size="sm" onPress={() => setIsModalOpen(false)}>Close</Button>
                </div>
              </ModalHeader>
              <ModalBody className="py-4 overflow-y-auto flex-grow">
                <div className="space-y-6">
                  <div><h3 className="text-lg font-semibold mb-4 text-red-700">Red Alliance</h3>{selectedMatch.teams.filter(t => t.alliance === 'Red').map(team => renderTeamDetails(team, selectedMatch.matchNumber))}</div>
                  <div><h3 className="text-lg font-semibold mb-4 text-blue-700">Blue Alliance</h3>{selectedMatch.teams.filter(t => t.alliance === 'Blue').map(team => renderTeamDetails(team, selectedMatch.matchNumber))}</div>
                </div>
              </ModalBody>
            </>
          ) : null}
        </ModalContent>
      </Modal>
    </>
  );
}
