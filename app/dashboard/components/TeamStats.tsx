'use client';

import { useEffect, useState } from 'react';
import { Card } from "@heroui/react";
import { calculateAutoScore, calculateTeleopScore, calculateEndGameScore } from '@/app/lib/utils';

interface AverageStats {
  auto: {
    avgFuelCount: number;
    towerSuccessRate: number;
    totalScore: number;
  };
  teleop: {
    avgFuelCount: number;
    avgHumanFuelCount: number;
    passBumpRate: number;
    passTrenchRate: number;
    totalScore: number;
  };
  endGame: {
    towerL1Rate: number;
    towerL2Rate: number;
    towerL3Rate: number;
    totalScore: number;
  };
  leftStartingZoneRate: number;
  autoMoveRate: number;
  teleopMoveRate: number;
  avgClimbingTime: number;
  avgRankingPoints: number;
  coopPointRate: number;
}

export function TeamStats({ teamNumber, records }) {
  const [stats, setStats] = useState<AverageStats | null>(null);

  useEffect(() => {
    if (!records || !Array.isArray(records)) {
      setStats(null);
      return;
    }
    const totalMatches = records.length;
    if (totalMatches === 0) {
      setStats(null);
      return;
    }

    let autoFuel = 0, towerSuccesses = 0, autoScoreTotal = 0;
    let teleopFuel = 0, humanFuel = 0, passBumps = 0, passTrenches = 0, teleopScoreTotal = 0;
    let towerL1Count = 0, towerL2Count = 0, towerL3Count = 0, endGameScoreTotal = 0;
    let leftZone = 0, autoMove = 0, teleopMove = 0, climbTime = 0, rp = 0, coop = 0;

    records.forEach(record => {
      autoFuel += record.autonomous?.fuelCount || 0;
      if (record.autonomous?.isTowerSuccess) towerSuccesses++;
      autoScoreTotal += calculateAutoScore(record.autonomous);

      teleopFuel += record.teleop?.fuelCount || 0;
      humanFuel += record.teleop?.humanFuelCount || 0;
      if (record.teleop?.passBump) passBumps++;
      if (record.teleop?.passTrench) passTrenches++;
      teleopScoreTotal += calculateTeleopScore(record.teleop);

      const ts = record.endAndAfterGame?.towerStatus;
      if (ts === 'L1') towerL1Count++;
      else if (ts === 'L2') towerL2Count++;
      else if (ts === 'L3') towerL3Count++;
      endGameScoreTotal += calculateEndGameScore(ts);

      if (record.autonomous?.leftStartingZone) leftZone++;
      if (record.endAndAfterGame?.autonomousMove) autoMove++;
      if (record.endAndAfterGame?.teleopMove) teleopMove++;
      climbTime += record.endAndAfterGame?.climbingTime || 0;
      rp += record.endAndAfterGame?.rankingPoint || 0;
      if (record.endAndAfterGame?.coopPoint) coop++;
    });

    const n = totalMatches;
    setStats({
      auto: {
        avgFuelCount: +(autoFuel / n).toFixed(1),
        towerSuccessRate: +((towerSuccesses / n) * 100).toFixed(1),
        totalScore: +(autoScoreTotal / n).toFixed(1),
      },
      teleop: {
        avgFuelCount: +(teleopFuel / n).toFixed(1),
        avgHumanFuelCount: +(humanFuel / n).toFixed(1),
        passBumpRate: +((passBumps / n) * 100).toFixed(1),
        passTrenchRate: +((passTrenches / n) * 100).toFixed(1),
        totalScore: +(teleopScoreTotal / n).toFixed(1),
      },
      endGame: {
        towerL1Rate: +((towerL1Count / n) * 100).toFixed(1),
        towerL2Rate: +((towerL2Count / n) * 100).toFixed(1),
        towerL3Rate: +((towerL3Count / n) * 100).toFixed(1),
        totalScore: +(endGameScoreTotal / n).toFixed(1),
      },
      leftStartingZoneRate: +((leftZone / n) * 100).toFixed(1),
      autoMoveRate: +((autoMove / n) * 100).toFixed(1),
      teleopMoveRate: +((teleopMove / n) * 100).toFixed(1),
      avgClimbingTime: +(climbTime / n).toFixed(1),
      avgRankingPoints: +(rp / n).toFixed(1),
      coopPointRate: +((coop / n) * 100).toFixed(1),
    });
  }, [records]);

  if (!teamNumber || !stats) return null;

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Team {teamNumber} Statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Auto */}
        <div className="bg-default-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Auto Averages</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-gray-600">Fuel Count</span><span className="font-medium">{stats.auto.avgFuelCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Tower Success</span><span className="font-medium">{stats.auto.towerSuccessRate}%</span></div>
            <div className="flex justify-between font-semibold pt-2 border-t"><span>Avg Score</span><span>{stats.auto.totalScore}</span></div>
          </div>
        </div>

        {/* Teleop */}
        <div className="bg-default-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Teleop Averages</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-gray-600">Fuel Count</span><span className="font-medium">{stats.teleop.avgFuelCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Human Fuel</span><span className="font-medium">{stats.teleop.avgHumanFuelCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Pass Bump</span><span className="font-medium">{stats.teleop.passBumpRate}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Pass Trench</span><span className="font-medium">{stats.teleop.passTrenchRate}%</span></div>
            <div className="flex justify-between font-semibold pt-2 border-t"><span>Avg Score</span><span>{stats.teleop.totalScore}</span></div>
          </div>
        </div>

        {/* End Game */}
        <div className="bg-default-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">End Game Averages</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-gray-600">Tower L1 Rate</span><span className="font-medium">{stats.endGame.towerL1Rate}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Tower L2 Rate</span><span className="font-medium">{stats.endGame.towerL2Rate}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Tower L3 Rate</span><span className="font-medium">{stats.endGame.towerL3Rate}%</span></div>
            <div className="flex justify-between font-semibold pt-2 border-t"><span>Avg Score</span><span>{stats.endGame.totalScore}</span></div>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Movement & Climbing</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Left Starting Zone</p><p className="text-xl font-bold">{stats.leftStartingZoneRate}%</p></div>
          <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Auto Movement</p><p className="text-xl font-bold">{stats.autoMoveRate}%</p></div>
          <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Teleop Movement</p><p className="text-xl font-bold">{stats.teleopMoveRate}%</p></div>
          <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Avg Climbing Time</p><p className="text-xl font-bold">{stats.avgClimbingTime}s</p></div>
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Points</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Ranking Points</p><p className="text-xl font-bold">{stats.avgRankingPoints}</p></div>
          <div className="bg-default-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Coop Point Rate</p><p className="text-xl font-bold">{stats.coopPointRate}%</p></div>
        </div>
      </section>
    </Card>
  );
}
