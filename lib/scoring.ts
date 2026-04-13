export interface LiveData {
  orange_cap_rankings: string[];
  purple_cap_rankings: string[];
  top4_teams: string[];
  tournament_winner: string | null;
}

export interface Predictions {
  orange_cap_1: string;
  orange_cap_2: string;
  orange_cap_3: string;
  purple_cap_1: string;
  purple_cap_2: string;
  purple_cap_3: string;
  top4_team_1: string;
  top4_team_2: string;
  top4_team_3: string;
  top4_team_4: string;
  ipl_winner: string;
}

export interface ScoreBreakdown {
  orangeCapPts: number;
  purpleCapPts: number;
  top4Pts: number;
  winnerPts: number;
  gameBonusPts: number;
  total: number;
  details: {
    orangeCap: { player: string; rank: number | null; pts: number }[];
    purpleCap: { player: string; rank: number | null; pts: number }[];
    top4: { team: string; correct: boolean; pts: number }[];
    winner: { team: string; correct: boolean; pts: number };
  };
}

// Normalize a player name to "INITIAL LASTNAME" for fuzzy matching
// e.g. "Anshul Kamboj" → "a kamboj", "A Kamboj" → "a kamboj"
function normalizeName(name: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return name.toLowerCase();
  const last = parts[parts.length - 1];
  const first = parts[0]; // could be "a" or "anshul" — just take first char
  return `${first[0]} ${last}`;
}

function nameMatches(a: string, b: string): boolean {
  if (a.toLowerCase() === b.toLowerCase()) return true;
  return normalizeName(a) === normalizeName(b);
}

function getCapPoints(player: string, rankings: string[]): { rank: number | null; pts: number } {
  const idx = rankings.findIndex(r => nameMatches(r, player));
  if (idx === -1) return { rank: null, pts: 0 };
  const rank = idx + 1;
  if (rank === 1) return { rank, pts: 7 };
  if (rank <= 3) return { rank, pts: 3 };
  if (rank <= 10) return { rank, pts: 1 };
  return { rank, pts: 0 };
}

export function calculateScore(
  predictions: Predictions,
  live: LiveData,
  gameBonusPts: number = 0
): ScoreBreakdown {
  const orangePicks = [predictions.orange_cap_1, predictions.orange_cap_2, predictions.orange_cap_3];
  const purplePicks = [predictions.purple_cap_1, predictions.purple_cap_2, predictions.purple_cap_3];
  const top4Picks = [predictions.top4_team_1, predictions.top4_team_2, predictions.top4_team_3, predictions.top4_team_4];

  const orangeDetails = orangePicks.filter(Boolean).map(player => {
    const { rank, pts } = getCapPoints(player, live.orange_cap_rankings);
    return { player, rank, pts };
  });

  const purpleDetails = purplePicks.filter(Boolean).map(player => {
    const { rank, pts } = getCapPoints(player, live.purple_cap_rankings);
    return { player, rank, pts };
  });

  const top4Details = top4Picks.filter(Boolean).map(team => {
    const correct = live.top4_teams.some(t => t.toLowerCase() === team.toLowerCase());
    return { team, correct, pts: correct ? 3 : 0 };
  });

  const winnerCorrect = live.tournament_winner
    ? live.tournament_winner.toLowerCase() === predictions.ipl_winner?.toLowerCase()
    : false;
  const winnerDetail = {
    team: predictions.ipl_winner || '',
    correct: winnerCorrect,
    pts: winnerCorrect ? 10 : 0,
  };

  const orangeCapPts = orangeDetails.reduce((s, d) => s + d.pts, 0);
  const purpleCapPts = purpleDetails.reduce((s, d) => s + d.pts, 0);
  const top4Pts = top4Details.reduce((s, d) => s + d.pts, 0);
  const winnerPts = winnerDetail.pts;

  return {
    orangeCapPts,
    purpleCapPts,
    top4Pts,
    winnerPts,
    gameBonusPts,
    total: orangeCapPts + purpleCapPts + top4Pts + winnerPts + gameBonusPts,
    details: {
      orangeCap: orangeDetails,
      purpleCap: purpleDetails,
      top4: top4Details,
      winner: winnerDetail,
    },
  };
}
