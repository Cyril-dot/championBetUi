import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { publicMatches } from '../../utils/api';
import type { Match } from '../../utils/api';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ScheduleIcon from '@mui/icons-material/Schedule';


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatKickoff(kickoffAt?: string): string {
  if (!kickoffAt) return '--:--';
  const date = new Date(kickoffAt);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(kickoffAt?: string): string {
  if (!kickoffAt) return '';
  const date = new Date(kickoffAt);
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

interface OddsMap { home: number; draw: number; away: number; }
interface EnrichedMatch extends Match { oddsMap?: OddsMap; }

// ---------------------------------------------------------------------------
// Status sets
// ---------------------------------------------------------------------------
const LIVE_STATUSES = new Set([
  'LIVE', 'live', 'IN_PLAY', 'in_play', 'inplay',
  'FIRST_HALF', 'first_half', '1H', '1h',
  'SECOND_HALF', 'second_half', '2H', '2h',
  'HALFTIME', 'halftime', 'HALF_TIME', 'half_time', 'HT', 'ht',
  'EXTRA_TIME', 'extra_time', 'ET', 'et',
  'PENALTIES', 'penalties', 'PEN', 'pen', 'P',
  'BREAK', 'break', 'SUSPENDED', 'suspended',
]);

const FINISHED_STATUSES = new Set([
  'FINISHED', 'finished',
  'FULL_TIME', 'full_time',
  'FT', 'ft',
  'AWARDED', 'awarded',
  'CANCELLED', 'cancelled', 'CANCELED', 'canceled',
  'POSTPONED', 'postponed',
  'ABANDONED', 'abandoned',
  'VOID', 'void',
  'AFTER_EXTRA_TIME', 'after_extra_time', 'AET', 'aet',
  'AFTER_PENALTIES', 'after_penalties', 'AP', 'ap',
  'ENDED', 'ended',
  'COMPLETED', 'completed',
  'COMPLETE', 'complete',
  'WALKOVER', 'walkover',
  'RETIRED', 'retired',
  'INTERRUPTED', 'interrupted',
  'DELAYED', 'delayed',
  'COVERAGE_LOST', 'coverage_lost',
]);

function finishedLabel(status?: string): string {
  const s = status ?? '';
  if (['FINISHED', 'finished', 'FULL_TIME', 'full_time', 'FT', 'ft', 'AWARDED', 'awarded',
       'ENDED', 'ended', 'COMPLETED', 'completed', 'COMPLETE', 'complete'].includes(s)) return 'FT';
  if (['AFTER_EXTRA_TIME', 'after_extra_time', 'AET', 'aet'].includes(s)) return 'AET';
  if (['AFTER_PENALTIES', 'after_penalties', 'AP', 'ap'].includes(s)) return 'PEN';
  if (['POSTPONED', 'postponed'].includes(s)) return 'PPD';
  if (['CANCELLED', 'cancelled', 'CANCELED', 'canceled'].includes(s)) return 'CANC';
  if (['ABANDONED', 'abandoned'].includes(s)) return 'ABD';
  if (['VOID', 'void'].includes(s)) return 'VOID';
  if (['WALKOVER', 'walkover'].includes(s)) return 'WO';
  if (['INTERRUPTED', 'interrupted'].includes(s)) return 'INT';
  return 'FT';
}

// ---------------------------------------------------------------------------
// League definitions
// ---------------------------------------------------------------------------
const TOP_6_LEAGUES = [
  { label: 'Premier League',   shortLabel: 'EPL'  },
  { label: 'La Liga',          shortLabel: 'Liga' },
  { label: 'Bundesliga',       shortLabel: 'BUN'  },
  { label: 'Serie A',          shortLabel: 'SA'   },
  { label: 'Ligue 1',          shortLabel: 'L1'   },
  { label: 'Champions League', shortLabel: 'UCL'  },
] as const;

const TOP_6_LABELS = new Set<string>(TOP_6_LEAGUES.map((l) => l.label));

const PREMIER_LEAGUE_TEAMS = new Set([
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
  'Brighton & Hove Albion', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham',
  'Ipswich Town', 'Leicester City', 'Liverpool', 'Manchester City',
  'Manchester United', 'Newcastle United', 'Nottingham Forest',
  'Southampton', 'Tottenham Hotspur', 'West Ham United', 'Wolverhampton Wanderers',
  'Wolves', 'Spurs', 'Man City', 'Man United', 'Man Utd', 'Newcastle',
  'Nottm Forest', 'Brighton & Hove', 'West Ham',
]);

const LA_LIGA_TEAMS = new Set([
  'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Atletico de Madrid',
  'Atletico', 'Athletic Club', 'Athletic Bilbao', 'Real Sociedad',
  'Villarreal', 'Real Betis', 'Sevilla', 'Valencia', 'Osasuna', 'Getafe',
  'Girona', 'Las Palmas', 'Mallorca', 'Celta Vigo', 'Deportivo Alaves',
  'Alaves', 'Leganes', 'Rayo Vallecano', 'Espanyol', 'Valladolid',
]);

const BUNDESLIGA_TEAMS = new Set([
  'Bayern Munich', 'FC Bayern Munich', 'Bayer Leverkusen', 'Borussia Dortmund',
  'RB Leipzig', 'Eintracht Frankfurt', 'VfB Stuttgart', 'Stuttgart',
  'SC Freiburg', 'Freiburg', 'Hoffenheim', 'TSG Hoffenheim', 'Werder Bremen',
  'Mainz', 'FSV Mainz 05', '1. FSV Mainz 05',
  'Borussia Monchengladbach', 'Augsburg', 'FC Augsburg', 'VfL Wolfsburg',
  'Wolfsburg', 'Union Berlin', 'FC Union Berlin', 'Holstein Kiel', 'Kiel',
  'St. Pauli', 'FC St. Pauli', 'Heidenheim', '1. FC Heidenheim',
  'Bochum', 'VfL Bochum',
]);

const SERIE_A_TEAMS = new Set([
  'Napoli', 'Inter Milan', 'Inter', 'Juventus', 'AC Milan', 'Milan',
  'Lazio', 'Roma', 'AS Roma', 'Atalanta', 'Fiorentina', 'Bologna',
  'Torino', 'Cagliari', 'Genoa', 'Lecce', 'Monza', 'Empoli',
  'Hellas Verona', 'Verona', 'Udinese', 'Venezia', 'Como', 'Parma',
]);

const LIGUE_1_TEAMS = new Set([
  'Paris Saint-Germain', 'PSG', 'Monaco', 'AS Monaco', 'Nice', 'OGC Nice',
  'Lyon', 'Olympique Lyonnais', 'Lille', 'LOSC Lille', 'Marseille',
  'Olympique de Marseille', 'Lens', 'RC Lens', 'Rennes', 'Stade Rennais',
  'Nantes', 'Reims', 'Stade de Reims', 'Strasbourg', 'RC Strasbourg',
  'Brest', 'Stade Brestois', 'Metz', 'Montpellier', 'Toulouse', 'Le Havre',
  'Angers', 'Auxerre', 'Saint-Etienne',
]);

const CHAMPIONS_LEAGUE_TEAMS = new Set([
  ...PREMIER_LEAGUE_TEAMS,
  ...LA_LIGA_TEAMS,
  ...BUNDESLIGA_TEAMS,
  ...SERIE_A_TEAMS,
  ...LIGUE_1_TEAMS,
]);

const LEAGUE_TEAM_MAP: Record<string, Set<string>> = {
  'Premier League':   PREMIER_LEAGUE_TEAMS,
  'La Liga':          LA_LIGA_TEAMS,
  'Bundesliga':       BUNDESLIGA_TEAMS,
  'Serie A':          SERIE_A_TEAMS,
  'Ligue 1':          LIGUE_1_TEAMS,
  'Champions League': CHAMPIONS_LEAGUE_TEAMS,
};

function hasVerifiedTeam(m: EnrichedMatch, leagueLabel: string): boolean {
  const teamSet = LEAGUE_TEAM_MAP[leagueLabel];
  if (!teamSet) return true;
  return teamSet.has(m.homeTeam ?? '') || teamSet.has(m.awayTeam ?? '');
}

function matchBelongsToLeague(m: EnrichedMatch, leagueLabel: string): boolean {
  if ((m.league ?? '') !== leagueLabel) return false;
  if (leagueLabel === 'Champions League') return true;
  return hasVerifiedTeam(m, leagueLabel);
}

function isTop6Match(m: EnrichedMatch): boolean {
  const league = m.league ?? '';
  if (!TOP_6_LABELS.has(league)) return false;
  if (league === 'Champions League') return true;
  return hasVerifiedTeam(m, league);
}

function getDisplayLeagueName(m: EnrichedMatch): string {
  const league = m.league ?? 'Other';
  if (!TOP_6_LABELS.has(league)) return league;
  if (league === 'Champions League') return league;
  if (hasVerifiedTeam(m, league)) return league;
  return 'Other Leagues';
}

function leagueSortKey(leagueName: string): string {
  const idx = TOP_6_LEAGUES.findIndex((l) => l.label === leagueName);
  return idx === -1 ? `z_${leagueName.toLowerCase()}` : `${String(idx).padStart(2, '0')}_${leagueName}`;
}

// ---------------------------------------------------------------------------
// FinishedMatchRow
// ---------------------------------------------------------------------------
function FinishedMatchRow({ match }: { match: EnrichedMatch }) {
  const navigate = useNavigate();
  const scoreHome = match.scoreHome ?? 0;
  const scoreAway = match.scoreAway ?? 0;
  const label = finishedLabel(match.status);
  const homeWon = scoreHome > scoreAway;
  const awayWon = scoreAway > scoreHome;

  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      className="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors last:border-b-0"
    >
      <div className="flex flex-1 items-center gap-1.5 min-w-0 justify-end">
        <span className={`text-sm truncate text-right ${homeWon ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
          {match.homeTeam}
        </span>
        {match.homeLogo && (
          <img src={match.homeLogo} alt={match.homeTeam} className="w-5 h-5 object-contain shrink-0" />
        )}
      </div>

      <div className="flex flex-col items-center shrink-0 min-w-[64px]">
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-bold tabular-nums ${homeWon ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
            {scoreHome}
          </span>
          <span className="text-slate-300 dark:text-slate-600 font-bold">–</span>
          <span className={`text-lg font-bold tabular-nums ${awayWon ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
            {scoreAway}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-none mt-0.5">
          {label}
        </span>
      </div>

      <div className="flex flex-1 items-center gap-1.5 min-w-0">
        {match.awayLogo && (
          <img src={match.awayLogo} alt={match.awayTeam} className="w-5 h-5 object-contain shrink-0" />
        )}
        <span className={`text-sm truncate ${awayWon ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
          {match.awayTeam}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatchRow
// ---------------------------------------------------------------------------
function MatchRow({ match, isUpcomingLayout = false }: { match: EnrichedMatch; isUpcomingLayout?: boolean }) {
  const navigate = useNavigate();
  const { betSlip, addToBetSlip, showToast } = useAppStore();
  const isLive = LIVE_STATUSES.has(match.status ?? '');
  const isFinished = FINISHED_STATUSES.has(match.status ?? '');

  const isSelected = (market: string, selection: string) =>
    betSlip.some((s) => s.matchId === match.id && s.market === market && s.selection === selection);

  const handleOddClick = (e: React.MouseEvent, market: string, selection: string, odd: number) => {
    e.stopPropagation();
    addToBetSlip({ matchId: match.id, matchName: `${match.homeTeam} vs ${match.awayTeam}`, market, selection, odd });
    showToast('Added to bet slip', 'success');
  };

  const odds = match.oddsMap;

  if (isUpcomingLayout) {
    return (
      <div
        onClick={() => navigate(`/match/${match.id}`)}
        className="flex flex-col p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors last:border-b-0"
      >
        <div className="flex justify-between items-center mb-2">
          {match.kickoffAt
            ? <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(match.kickoffAt)}</span>
            : <span />}
          {match.kickoffAt && (
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <ScheduleIcon sx={{ fontSize: 12 }} />
              {formatKickoff(match.kickoffAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            {match.homeLogo && <img src={match.homeLogo} alt={match.homeTeam} className="w-5 h-5 object-contain shrink-0" />}
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{match.homeTeam}</span>
          </div>
          <span className="text-xs font-bold text-slate-400 shrink-0 px-1">vs</span>
          <div className="flex flex-1 items-center gap-1.5 justify-end min-w-0">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate text-right">{match.awayTeam}</span>
            {match.awayLogo && <img src={match.awayLogo} alt={match.awayTeam} className="w-5 h-5 object-contain shrink-0" />}
          </div>
        </div>

        {odds ? (
          <div className="grid grid-cols-3 gap-1.5">
            {(['1', 'X', '2'] as const).map((sel, idx) => {
              const val = [odds.home, odds.draw, odds.away][idx];
              return (
                <button
                  key={sel}
                  onClick={(e) => handleOddClick(e, '1X2', sel, val)}
                  className={`flex flex-col items-center py-1.5 px-2 rounded border text-xs font-semibold transition-colors
                    ${isSelected('1X2', sel)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary'
                    }`}
                >
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mb-0.5 truncate max-w-full">
                    {sel === 'X' ? 'Draw' : sel}
                  </span>
                  <span className="tabular-nums">{val > 0 ? val.toFixed(2) : '—'}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                <span className="text-xs text-slate-400">—</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors last:border-b-0"
    >
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-1.5 mb-1">
          {isLive ? (
            <span className="flex items-center gap-1 text-xs text-green-500 font-semibold">
              <FiberManualRecordIcon sx={{ fontSize: 8 }} className="animate-pulse" />
              {match.minutePlayed != null ? `${match.minutePlayed}'` : 'LIVE'}
            </span>
          ) : match.kickoffAt ? (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ScheduleIcon sx={{ fontSize: 12 }} />
              {formatKickoff(match.kickoffAt)}
            </span>
          ) : null}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {match.homeLogo && <img src={match.homeLogo} alt={match.homeTeam} className="w-4 h-4 object-contain shrink-0" />}
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{match.homeTeam}</span>
            </div>
            {(isLive || isFinished) && (
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">{match.scoreHome ?? 0}</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {match.awayLogo && <img src={match.awayLogo} alt={match.awayTeam} className="w-4 h-4 object-contain shrink-0" />}
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{match.awayTeam}</span>
            </div>
            {(isLive || isFinished) && (
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">{match.scoreAway ?? 0}</span>
            )}
          </div>
        </div>
      </div>

      {odds ? (
        <div className="flex gap-1 shrink-0">
          {(['1', 'X', '2'] as const).map((sel, idx) => {
            const val = [odds.home, odds.draw, odds.away][idx];
            return (
              <button
                key={sel}
                onClick={(e) => handleOddClick(e, '1X2', sel, val)}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded border text-xs font-semibold transition-colors
                  ${isSelected('1X2', sel)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary'
                  }`}
              >
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-none mb-0.5">{sel}</span>
                <span className="tabular-nums leading-none">{val > 0 ? val.toFixed(2) : '—'}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-1 shrink-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-12 h-12 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
              <span className="text-xs text-slate-400">—</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonRow
// ---------------------------------------------------------------------------
function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 animate-pulse">
      <div className="flex-1 space-y-2 mr-3">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => <div key={i} className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded" />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Odds extraction
// ---------------------------------------------------------------------------
function extractOddsMap(oddsArray: unknown[], homeTeam: string, awayTeam: string): OddsMap | undefined {
  if (!Array.isArray(oddsArray) || oddsArray.length === 0) return undefined;

  const entries = (oddsArray as Array<Record<string, unknown>>).filter((o) => {
    const market = String(o.market ?? o.market_name ?? o.marketName ?? o.type ?? '')
      .toLowerCase().replace(/[\s_-]/g, '');
    return market === '1x2' || market === 'matchresult' || market === 'matchodds';
  });

  const pool = entries.length > 0 ? entries : (oddsArray as Array<Record<string, unknown>>);
  const parseOdd = (o: Record<string, unknown>): number =>
    parseFloat(String(o.odd ?? o.value ?? o.odds ?? o.price ?? o.decimal ?? '0'));

  const norm = (s: string) => s.toLowerCase().trim();
  const normHome = norm(homeTeam);
  const normAway = norm(awayTeam);
  const matchesTeam = (selection: string, teamNorm: string) => {
    const sel = norm(selection);
    return sel === teamNorm || sel.includes(teamNorm) || teamNorm.includes(sel);
  };

  let home = 0, draw = 0, away = 0;
  for (const o of pool) {
    const sel = norm(String(o.selection ?? o.outcome ?? o.name ?? o.label ?? ''));
    const val = parseOdd(o);
    if (val <= 0) continue;
    if (sel === 'draw' || sel === 'x') { if (draw === 0) draw = val; }
    else if (matchesTeam(sel, normHome)) { if (home === 0) home = val; }
    else if (matchesTeam(sel, normAway)) { if (away === 0) away = val; }
  }

  if (home === 0 && draw === 0 && away === 0) {
    const numericVals = pool.map(parseOdd).filter((v) => v > 1 && v < 50);
    if (numericVals.length >= 3) return { home: numericVals[0], draw: numericVals[1], away: numericVals[2] };
    return undefined;
  }
  return { home, draw, away };
}

// ---------------------------------------------------------------------------
// FIX #5: Unwrap /with-all-odds response — now includes catch-all for any
// array key not in the known categories list, so live data is never silently
// dropped if the backend uses a different key name.
// ---------------------------------------------------------------------------
function unwrapResponse(raw: unknown): Array<{ match: Match; odds: unknown[] }> {
  if (!raw) return [];
  const obj = raw as Record<string, unknown>;
  if (!obj.success || !obj.data) return [];
  const data = obj.data as Record<string, unknown>;
  const allItems: Array<{ match: Match; odds: unknown[] }> = [];

  // Known category keys — process these first
  const categories = ['future', 'live', 'results', 'today', 'upcoming'] as const;
  const consumed = new Set<string>();

  for (const cat of categories) {
    const arr = data[cat];
    if (Array.isArray(arr)) {
      consumed.add(cat);
      for (const item of arr) {
        const i = item as Record<string, unknown>;
        const match = i.match as Match;
        if (!match || !match.id) continue;
        const oddsArray: unknown[] = Array.isArray(i.match_result)
          ? (i.match_result as unknown[])
          : Array.isArray(i.odds)
          ? (i.odds as unknown[])
          : [];
        allItems.push({ match, odds: oddsArray });
      }
    }
  }

  // FIX #5: Catch-all — pick up any array under an unexpected key name.
  // This prevents live matches from being silently dropped when the backend
  // returns them under a key not in the known categories list above.
  for (const [key, val] of Object.entries(data)) {
    if (consumed.has(key) || !Array.isArray(val)) continue;
    for (const item of val as unknown[]) {
      const i = item as Record<string, unknown>;
      // Some shapes inline the match directly; others nest it under "match"
      const match = (i.match ?? i) as Match;
      if (!match || !match.id) continue;
      const oddsArray: unknown[] = Array.isArray(i.match_result)
        ? (i.match_result as unknown[])
        : Array.isArray(i.odds)
        ? (i.odds as unknown[])
        : [];
      allItems.push({ match, odds: oddsArray });
    }
  }

  return allItems;
}

// ---------------------------------------------------------------------------
// Categorise
// ---------------------------------------------------------------------------
type MatchCategory = 'live' | 'today' | 'upcoming' | 'finished';

function categorise(match: Match): MatchCategory {
  const status = match.status ?? '';
  if (FINISHED_STATUSES.has(status)) return 'finished';
  if (LIVE_STATUSES.has(status)) return 'live';
  if (match.kickoffAt) {
    const kickoff = new Date(match.kickoffAt);
    const now = new Date();
    if (kickoff.toDateString() === now.toDateString()) return 'today';
    if (kickoff > now) return 'upcoming';
    return 'finished';
  }
  return 'finished';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function MatchList() {
  const [allMatches, setAllMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [showFinished, setShowFinished] = useState(true);
  const genRef = useRef(0);

  useEffect(() => {
    const myGen = ++genRef.current;
    const alive = () => myGen === genRef.current;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await publicMatches.withAllOdds();
        if (!alive()) return;
        const items = unwrapResponse(response);
        const enriched: EnrichedMatch[] = [];

        for (const item of items) {
          const oddsMap = extractOddsMap(item.odds, item.match.homeTeam ?? '', item.match.awayTeam ?? '');
          enriched.push({ ...item.match, oddsMap });
        }

        const seen = new Set<string>();
        const deduped = enriched.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        if (alive()) setAllMatches(deduped);
      } catch (err) {
        if (alive()) setError((err as Error).message ?? 'Failed to load matches');
      } finally {
        if (alive()) setLoading(false);
      }
    }

    load();

    // Poll every 30s when the tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30_000);

    // FIX #6: Force an immediate reload when the user returns to the tab.
    // Without this, if the tab was hidden for >30s the data stays stale
    // until the next interval fires — which could be another 30s away.
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      genRef.current++;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const { leagueMatches, otherMatches } = useMemo(() => {
    if (!activeLeague) {
      return { leagueMatches: allMatches, otherMatches: [] as EnrichedMatch[] };
    }

    const inLeague: EnrichedMatch[] = [];
    const outside: EnrichedMatch[] = [];

    for (const m of allMatches) {
      if (matchBelongsToLeague(m, activeLeague)) {
        inLeague.push(m);
      } else {
        outside.push(m);
      }
    }

    return { leagueMatches: inLeague, otherMatches: outside };
  }, [allMatches, activeLeague]);

  const grouped = useMemo(() => {
    const cats: Record<MatchCategory, EnrichedMatch[]> = {
      live: [], today: [], upcoming: [], finished: [],
    };
    for (const m of leagueMatches) cats[categorise(m)].push(m);
    cats.finished.sort((a, b) => {
      const ta = a.kickoffAt ? new Date(a.kickoffAt).getTime() : 0;
      const tb = b.kickoffAt ? new Date(b.kickoffAt).getTime() : 0;
      return tb - ta;
    });
    return cats;
  }, [leagueMatches]);

  const otherGrouped = useMemo(() => {
    const cats: Record<MatchCategory, EnrichedMatch[]> = {
      live: [], today: [], upcoming: [], finished: [],
    };
    for (const m of otherMatches) cats[categorise(m)].push(m);
    cats.finished.sort((a, b) => {
      const ta = a.kickoffAt ? new Date(a.kickoffAt).getTime() : 0;
      const tb = b.kickoffAt ? new Date(b.kickoffAt).getTime() : 0;
      return tb - ta;
    });
    return cats;
  }, [otherMatches]);

  // ---------------------------------------------------------------------------
  // Rendering helpers
  // ---------------------------------------------------------------------------

  function groupByLeague(matches: EnrichedMatch[]): Map<string, EnrichedMatch[]> {
    const map = new Map<string, EnrichedMatch[]>();
    for (const m of matches) {
      const key = getDisplayLeagueName(m);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return new Map(
      [...map.entries()].sort(([a], [b]) =>
        leagueSortKey(a).localeCompare(leagueSortKey(b))
      ),
    );
  }

  function renderLeagueCard(league: string, lm: EnrichedMatch[], isUpcoming: boolean, isFinishedSection = false) {
    const showLogo = TOP_6_LABELS.has(league) && league !== 'Other Leagues';
    return (
      <div key={league} className="card mb-2 overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          {showLogo && lm[0]?.leagueLogo && (
            <img src={lm[0].leagueLogo} alt={league} className="w-4 h-4 object-contain" />
          )}
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            {league}
          </span>
          <span className="ml-auto text-xs text-slate-400">{lm.length}</span>
        </div>
        {lm.map((m, i) =>
          isFinishedSection
            ? <FinishedMatchRow key={m.id ?? `row-${i}`} match={m} />
            : <MatchRow key={m.id ?? `row-${i}`} match={m} isUpcomingLayout={isUpcoming} />
        )}
      </div>
    );
  }

  function renderSection(
    title: string,
    isLiveSection: boolean,
    matches: EnrichedMatch[],
    isUpcoming: boolean,
    isFinishedSection = false,
  ) {
    if (matches.length === 0) return null;

    const top6 = matches.filter(isTop6Match);
    const others = matches.filter((m) => !isTop6Match(m));

    return (
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-heading text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {isLiveSection && <FiberManualRecordIcon sx={{ fontSize: 10 }} className="text-green-500 animate-pulse" />}
            {isFinishedSection && (
              <svg className="text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            )}
            {title}
            <span className="text-slate-400 font-normal text-sm">({matches.length})</span>
          </h2>
          {isFinishedSection && (
            <button
              onClick={() => setShowFinished((v) => !v)}
              className="ml-auto text-xs text-primary font-medium hover:underline"
            >
              {showFinished ? 'Hide' : 'Show'}
            </button>
          )}
        </div>

        {isFinishedSection && !showFinished ? null : (
          <>
            {[...groupByLeague(top6).entries()].map(([league, lm]) =>
              renderLeagueCard(league, lm, isUpcoming, isFinishedSection)
            )}

            {top6.length > 0 && others.length > 0 && (
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Other Leagues
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
            )}

            {[...groupByLeague(others).entries()].map(([league, lm]) =>
              renderLeagueCard(league, lm, isUpcoming, isFinishedSection)
            )}
          </>
        )}
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className="px-4 mt-6">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const hasOtherContent =
    otherMatches.length > 0 &&
    (otherGrouped.live.length > 0 ||
      otherGrouped.today.length > 0 ||
      otherGrouped.upcoming.length > 0 ||
      otherGrouped.finished.length > 0);

  return (
    <div className="px-4 mt-4">
      {/* League filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setActiveLeague(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
            ${activeLeague === null
              ? 'bg-primary text-white border-primary'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary'
            }`}
        >
          All
        </button>
        {TOP_6_LEAGUES.map((league) => (
          <button
            key={league.label}
            onClick={() => setActiveLeague(activeLeague === league.label ? null : league.label)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap
              ${activeLeague === league.label
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary'
              }`}
          >
            {league.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3" />
          <div className="card overflow-hidden">
            {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      ) : (
        <>
          {renderSection('Live Now', true,  grouped.live,     false, false)}
          {renderSection('Today',    false, grouped.today,    false, false)}
          {renderSection('Upcoming', false, grouped.upcoming, true,  false)}
          {renderSection('Results',  false, grouped.finished, false, true)}

          {leagueMatches.length === 0 && !hasOtherContent && (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {activeLeague
                  ? `No matches found for ${activeLeague}.`
                  : 'No matches available right now.'}
              </p>
            </div>
          )}

          {hasOtherContent && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                  Other Leagues
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              {renderSection('Live Now', true,  otherGrouped.live,     false, false)}
              {renderSection('Today',    false, otherGrouped.today,    false, false)}
              {renderSection('Upcoming', false, otherGrouped.upcoming, true,  false)}
              {renderSection('Results',  false, otherGrouped.finished, false, true)}
            </div>
          )}
        </>
      )}
    </div>
  );
}