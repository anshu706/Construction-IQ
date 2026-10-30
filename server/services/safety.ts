/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Safety Metrics and Wind Safety Guard Service
 * Computes verifiable safety streaks and enforces non-auto-clearing crane halt protocols.
 */

export interface IncidentInput {
  id: string;
  occurredAt: string | Date;
  severity: 'Minor' | 'Moderate' | 'Severe';
  type: 'FirstAid' | 'NearMiss' | 'LostTime' | 'EquipmentDamage' | 'First Aid' | 'Near-Miss' | 'Lost-Time' | 'Equipment Damage';
  status: 'Open' | 'UnderInvestigation' | 'Resolved' | 'Under Investigation';
  isLostTime?: boolean;
}

export interface ProjectSafetyInput {
  startDate: string | Date;
  statusDate: string | Date;
  craneHalt?: boolean;
}

export const CRANE_WIND_THRESHOLD_MPH = 20.0;

/**
 * Calculates safety days streak based on verifiable Lost-Time incidents.
 * Days since the most recent incident with isLostTime = true (or type = Lost-Time).
 * If no Lost-Time incidents exist, counts days since project start.
 */
export function calculateSafetyStreak(
  project: ProjectSafetyInput,
  incidents: IncidentInput[],
  currentDate: string | Date = project.statusDate
): number {
  const currentMs = new Date(currentDate).getTime();
  const projectStartMs = new Date(project.startDate).getTime();

  // Find all lost-time incidents
  const lostTimeIncidents = incidents.filter(
    inc =>
      inc.isLostTime === true ||
      inc.type === 'LostTime' ||
      inc.type === 'Lost-Time'
  );

  let baselineMs = projectStartMs;

  if (lostTimeIncidents.length > 0) {
    // Sort descending to find the most recent lost-time incident
    const sorted = [...lostTimeIncidents].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
    const mostRecentMs = new Date(sorted[0].occurredAt).getTime();
    // Safety streak resets to zero from that date forward
    baselineMs = mostRecentMs;
  }

  const diffMs = currentMs - baselineMs;
  if (diffMs <= 0) return 0;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Evaluates wind speed against the safety threshold (> 20 mph).
 * Returns whether crane halt flag should be triggered and alert message.
 */
export function evaluateWindSafety(windSpeedMph: number, currentCraneHalt: boolean): {
  shouldHalt: boolean;
  alertRequired: boolean;
  message: string;
} {
  const isHighWind = windSpeedMph > CRANE_WIND_THRESHOLD_MPH;

  if (isHighWind) {
    return {
      shouldHalt: true,
      alertRequired: !currentCraneHalt, // Trigger new alert when transitioning into halt
      message: `CRITICAL SAFETY PROTOCOL: Wind speed measured at ${windSpeedMph.toFixed(1)} mph (threshold: ${CRANE_WIND_THRESHOLD_MPH} mph). Tower crane operations immediately halted.`,
    };
  }

  // If wind dropped below threshold, do NOT auto-clear.
  // Flag clears ONLY when confirmed by SafetyOfficer or ProjectManager.
  return {
    shouldHalt: currentCraneHalt,
    alertRequired: false,
    message: currentCraneHalt
      ? `Wind speed is safe (${windSpeedMph.toFixed(1)} mph), but Tower Crane halt remains active until cleared by authorized safety personnel.`
      : `Wind speed safe at ${windSpeedMph.toFixed(1)} mph. Normal crane operations permitted.`,
  };
}

/**
 * Counts open (unresolved) safety incidents.
 */
export function countOpenIncidents(incidents: IncidentInput[]): number {
  return incidents.filter(i => i.status !== 'Resolved').length;
}

