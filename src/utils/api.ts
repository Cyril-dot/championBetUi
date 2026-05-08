// =============================================================================
// api.ts — Auto-generated API client from OpenAPI spec
// Base URL: http://localhost:8080
// =============================================================================

const BASE_URL = "https://luminous-warmth-production.up.railway.app";
// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type UserStatus = "ACTIVE" | "DISABLED" | "LOCKED";
export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SETTLED" | "FAILED";
export type BetStatus = "PENDING" | "WON" | "LOST" | "VOID" | "CASHED_OUT";
export type PayoutStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
export type AffiliateWithdrawalStatus = "PENDING" | "PROCESSED" | "REJECTED";
export type AdminUpgradeChatStatus = "PENDING_COMMISSION" | "COMMISSION_SET" | "CLOSED";
export type SenderRole = "USER" | "SUPER_ADMIN" | "SYSTEM";
export type TransactionKind =
  | "DEPOSIT"
  | "WITHDRAW"
  | "WITHDRAW_HOLD"
  | "WITHDRAW_RELEASE"
  | "BET_STAKE"
  | "BET_WIN"
  | "REFERRAL_COMMISSION"
  | "PAYOUT"
  | "ADJUSTMENT"
  | "VIP_CASHBACK"
  | "VIP_MEMBERSHIP"
  | "WELCOME_BONUS"
  | "WITHDRAWAL_REFUND"
  | "ADMIN_UPGRADE_FEE";
export type MatchSource =
  | "SPORTDB"
  | "SPORTSRC"
  | "BSD"
  | "FOOTBALL_DATA"
  | "API_FOOTBALL"
  | "VIRTUAL"
  | "ADMIN_CREATED"
  | "LIVESCORE";

export interface GrantedAuthority {
  authority: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  role: UserRole;
  status: UserStatus;
  createdByAdminId?: string;
  referredViaLinkId?: string;
  themePreference?: string;
  winSeen?: boolean;
  totpSecret?: string;
  totpEnabled?: boolean;
  totpBackupCodes?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  authorities?: GrantedAuthority[];
  enabled?: boolean;
  password?: string;
  username?: string;
  accountNonLocked?: boolean;
  credentialsNonExpired?: boolean;
  accountNonExpired?: boolean;
}

export interface UserDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  role: string;
  themePreference?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: UserDto;
  mustSetup2fa?: boolean;
}

export interface Transaction {
  id: string;
  walletId: string;
  kind: TransactionKind;
  amount: number;
  balanceAfter: number;
  providerRef?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  user: User;
  amount: number;
  currency?: string;
  status: WithdrawalStatus;
  method: string;
  accountNumber: string;
  accountName: string;
  network?: string;
  admin?: User;
  adminNote?: string;
  superAdmin?: User;
  superAdminNote?: string;
  reviewedAt?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateWithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  currency?: string;
  status: AffiliateWithdrawalStatus;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  mobileMoneyNumber?: string;
  reference?: string;
  rejectReason?: string;
  requestedAt: string;
  processedAt?: string;
  updatedAt: string;
}

export interface PayoutRequest {
  id: string;
  adminId: string;
  amount: number;
  status: PayoutStatus;
  periodEnd?: string;
  rejectReason?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUpgradeChatMessageDto {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: SenderRole;
  senderName?: string;
  content: string;
  sentAt: string;
}

export interface AdminUpgradeChatDto {
  id: string;
  userId: string;
  userEmail?: string;
  userFirstName?: string;
  status: AdminUpgradeChatStatus;
  commissionRate?: number;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface GameRound {
  id: string;
  userId: string;
  game: string;
  stake: number;
  result?: Record<string, unknown>;
  payout?: number;
  playedAt: string;
}

export interface GameCrashSchedule {
  id: string;
  gameSlug: string;
  roundNumber: number;
  crashAt: number;
  tier?: string;
  highCrash?: boolean;
  extremeCrash?: boolean;
  generatedBy?: string;
  generatedAt: string;
  playedAt?: string;
  adminNotified?: boolean;
  overrideReason?: string;
}

export interface Match {
  id: string;
  source: MatchSource;
  externalId?: string;
  minutePlayed?: number;
  sport?: string;
  league?: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt?: string;
  status?: string;
  scoreHome?: number;
  scoreAway?: number;
  homeLogo?: string;
  awayLogo?: string;
  createdByAdminId?: string;
  leagueLogo?: string;
  featured?: boolean;
  metadata?: Record<string, unknown>;
  settledAt?: string;
  createdAt: string;
}

export interface Odds {
  id: string;
  matchId: string;
  market: string;
  selection: string;
  value: number;
  line?: number;
  handicap?: number;
  capturedAt: string;
}

export interface BetSelection {
  id: string;
  matchId: string;
  market: string;
  selection: string;
  oddsLocked: number;
  result?: string;
  homeTeam?: string;
  awayTeam?: string;
}

export interface Bet {
  id: string;
  userId: string;
  stake: number;
  currency?: string;
  totalOdds: number;
  potentialReturn: number;
  status: BetStatus;
  winSeen?: boolean;
  placedAt: string;
  settledAt?: string;
  bookingCodeUsedId?: string;
  selections: BetSelection[];
}

export interface BookingCode {
  id: string;
  code: string;
  creatorAdminId?: string;
  label?: string;
  kind?: string;
  bookingType?: string;
  version?: number;
  currency?: string;
  stake?: number;
  selections?: Record<string, unknown>[];
  totalOdds?: number;
  potentialPayout?: number;
  status?: string;
  redemptionCount?: number;
  maxRedemptions?: number;
  expiresAt?: string;
  createdAt: string;
}

export interface RedeemResponse {
  booking: BookingCode;
  enrichedSelections?: Record<string, unknown>[];
  currentTotalOdds?: number;
}

export interface ReferralLink {
  id: string;
  adminId: string;
  code: string;
  label?: string;
  commissionPercent?: number;
  active?: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface AiPrediction {
  id: string;
  matchId: string;
  model?: string;
  generatedAt: string;
  prediction?: Record<string, unknown>;
  sharedAt?: string;
  sharedByAdminId?: string;
  publishedToUsers?: boolean;
  adminNote?: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  targetEntity?: string;
  targetId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface AffiliateStatsDTO {
  totalReferrals: number;
  lifetimeStake: number;
  lifetimeCommission: number;
  availableBalance: number;
  currency?: string;
}

export interface ReferredUserDTO {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  joinedAt: string;
  lifetimeStake?: number;
  lifetimeCommission?: number;
}

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  ref?: string;
}

export interface DemoLoginRequest {
  role?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  themePreference?: string;
}

export interface WithdrawalRequestDto {
  amount: number;
  currency?: string;
  method: string;
  accountNumber: string;
  accountName: string;
  network?: string;
}

export interface AccountDetailsDTO {
  bankName: string;
  accountNumber: string;
  accountName: string;
  mobileMoneyNumber?: string;
}

export interface WithdrawalRequestDTO {
  amount: number;
  accountDetails: AccountDetailsDTO;
}

export interface PlaceBetRequest {
  stake: number;
  currency?: string;
  selections: SelectionDto[];
  bookingCodeUsedId?: string;
}

export interface SelectionDto {
  matchId: string;
  market: string;
  selection: string;
  submittedOdds: number;
}

export interface RedeemRequest {
  code: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface SetCommissionRequest {
  commissionRate: number;
}

export interface CreateLinkRequest {
  label?: string;
  expiresAt?: string;
}

export interface AdminMatchRequest {
  homeTeam: string;
  awayTeam: string;
  league?: string;
  sport?: string;
  homeLogo?: string;
  awayLogo?: string;
  leagueLogo?: string;
  kickoffAt?: string;
  status?: string;
  featured?: boolean;
}

export interface AdminStatusUpdateRequest {
  status: string;
}

export interface AdminScoreUpdateRequest {
  scoreHome: number;
  scoreAway: number;
  minutePlayed?: number;
}

export interface CreateBookingRequest {
  kind?: string;
  label?: string;
  currency?: string;
  stake?: number;
  selections?: Record<string, unknown>[];
  maxRedemptions?: number;
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Paginated response wrappers
// ---------------------------------------------------------------------------

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

// ---------------------------------------------------------------------------
// HTTP utility
// ---------------------------------------------------------------------------

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...extraHeaders,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error?.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

const http = {
  get: <T>(path: string, extraHeaders?: Record<string, string>) =>
    request<T>("GET", path, undefined, extraHeaders),
  post: <T>(path: string, body?: unknown, extraHeaders?: Record<string, string>) =>
    request<T>("POST", path, body, extraHeaders),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};

// ---------------------------------------------------------------------------
// Helper to build query strings
// ---------------------------------------------------------------------------

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const filtered = Object.entries(params).filter(([, v]) => v !== undefined);
  if (!filtered.length) return "";
  return "?" + filtered.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

// =============================================================================
// AUTH
// =============================================================================

export const auth = {
  /** POST /api/auth/login */
  login: (body: LoginRequest) =>
    http.post<ApiResponse<AuthResponse>>("/api/auth/login", body),

  /** POST /api/auth/register */
  register: (body: RegisterRequest) =>
    http.post<ApiResponse<AuthResponse>>("/api/auth/register", body),

  /** POST /api/auth/demo-login */
  demoLogin: (body: DemoLoginRequest) =>
    http.post<ApiResponse<AuthResponse>>("/api/auth/demo-login", body),

  /** POST /api/auth/logout */
  logout: () =>
    http.post<ApiResponse<void>>("/api/auth/logout"),

  /** POST /api/auth/refresh */
  refresh: () =>
    http.post<ApiResponse<AuthResponse>>("/api/auth/refresh"),

  /** POST /api/auth/verify-email */
  verifyEmail: (body: Record<string, string>) =>
    http.post<ApiResponse<Record<string, string>>>("/api/auth/verify-email", body),

  /** POST /api/auth/send-verification */
  sendVerification: (body: Record<string, string>) =>
    http.post<ApiResponse<Record<string, string>>>("/api/auth/send-verification", body),

  /** POST /api/auth/request-password-reset */
  requestPasswordReset: (body: Record<string, string>) =>
    http.post<ApiResponse<Record<string, string>>>("/api/auth/request-password-reset", body),

  /** POST /api/auth/reset-password */
  resetPassword: (body: Record<string, string>) =>
    http.post<ApiResponse<Record<string, string>>>("/api/auth/reset-password", body),
};

// =============================================================================
// USER
// =============================================================================

export const user = {
  /** GET /api/users/me */
  me: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/users/me"),

  /** PATCH /api/users/me */
  update: (body: UpdateProfileRequest) =>
    http.patch<ApiResponse<UserDto>>("/api/users/me", body),
};

// =============================================================================
// WALLET
// =============================================================================

export const wallet = {
  /** GET /api/wallet */
  getWallet: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/wallet"),

  /** GET /api/wallet/transactions */
  getTransactions: (page = 0, size = 20) =>
    http.get<ApiResponse<PageResponse<Transaction>>>(
      `/api/wallet/transactions${qs({ page, size })}`
    ),

  /** POST /api/wallet/withdraw */
  withdraw: (body: Record<string, unknown>) =>
    http.post<ApiResponse<Transaction>>("/api/wallet/withdraw", body),
};

// =============================================================================
// WALLET — WITHDRAWALS
// =============================================================================

export const withdrawals = {
  /** GET /api/wallet/withdrawals */
  getMyWithdrawals: (page = 0, size = 20, status?: WithdrawalStatus) =>
    http.get<ApiResponse<PageResponse<WithdrawalRequest>>>(
      `/api/wallet/withdrawals${qs({ page, size, status })}`
    ),

  /** POST /api/wallet/withdrawals */
  submit: (body: WithdrawalRequestDto) =>
    http.post<ApiResponse<WithdrawalRequest>>("/api/wallet/withdrawals", body),

  /** GET /api/wallet/withdrawals/:id */
  getById: (id: string) =>
    http.get<ApiResponse<WithdrawalRequest>>(`/api/wallet/withdrawals/${id}`),

  /** GET /api/wallet/withdrawals/admin/all */
  getAllForAdmin: (page = 0, size = 20, status?: WithdrawalStatus) =>
    http.get<ApiResponse<PageResponse<WithdrawalRequest>>>(
      `/api/wallet/withdrawals/admin/all${qs({ page, size, status })}`
    ),

  /** GET /api/wallet/withdrawals/admin/stats */
  getAdminStats: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/wallet/withdrawals/admin/stats"),

  /** GET /api/wallet/withdrawals/super-admin/stats */
  getSuperAdminStats: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/wallet/withdrawals/super-admin/stats"),

  /** POST /api/wallet/withdrawals/admin/:id/approve */
  approve: (id: string, body: Record<string, string>) =>
    http.post<ApiResponse<WithdrawalRequest>>(`/api/wallet/withdrawals/admin/${id}/approve`, body),

  /** POST /api/wallet/withdrawals/admin/:id/reject */
  reject: (id: string, body: Record<string, string>) =>
    http.post<ApiResponse<WithdrawalRequest>>(`/api/wallet/withdrawals/admin/${id}/reject`, body),

  /** POST /api/wallet/withdrawals/super-admin/:id/settle */
  settle: (id: string, body: Record<string, string>) =>
    http.post<ApiResponse<WithdrawalRequest>>(`/api/wallet/withdrawals/super-admin/${id}/settle`, body),

  /** POST /api/wallet/withdrawals/super-admin/:id/mark-failed */
  markFailed: (id: string, body: Record<string, string>) =>
    http.post<ApiResponse<WithdrawalRequest>>(`/api/wallet/withdrawals/super-admin/${id}/mark-failed`, body),
};

// =============================================================================
// DEPOSITS
// =============================================================================

export const deposits = {
  /** POST /api/wallet/deposit/stripe/intent */
  stripeIntent: (body: Record<string, unknown>) =>
    http.post<ApiResponse<Record<string, unknown>>>("/api/wallet/deposit/stripe/intent", body),

  /** POST /api/wallet/deposit/paystack/init */
  paystackInit: (body: Record<string, unknown>) =>
    http.post<ApiResponse<Record<string, unknown>>>("/api/wallet/deposit/paystack/init", body),
};

// =============================================================================
// WEBHOOKS
// =============================================================================

export const webhooks = {
  /** POST /api/webhooks/stripe */
  stripe: (payload: string, signature: string) =>
    http.post<string>("/api/webhooks/stripe", payload, { "Stripe-Signature": signature }),

  /** POST /api/webhooks/paystack */
  paystack: (signature?: string) => {
    const headers = signature ? { "x-paystack-signature": signature } : undefined;
    return http.post<string>("/api/webhooks/paystack", undefined, headers);
  },
};

// =============================================================================
// BETS
// =============================================================================

export const bets = {
  /** GET /api/bets */
  getMyBets: (page = 0, size = 20) =>
    http.get<ApiResponse<PageResponse<Bet>>>(`/api/bets${qs({ page, size })}`),

  /** POST /api/bets */
  place: (body: PlaceBetRequest) =>
    http.post<ApiResponse<Bet>>("/api/bets", body),

  /** GET /api/bets/:id */
  getOne: (id: string) =>
    http.get<ApiResponse<Bet>>(`/api/bets/${id}`),

  /** GET /api/bets/unseen-wins */
  getUnseenWins: () =>
    http.get<ApiResponse<Bet[]>>("/api/bets/unseen-wins"),

  /** POST /api/bets/:id/dismiss-win */
  dismissWin: (id: string) =>
    http.post<ApiResponse<void>>(`/api/bets/${id}/dismiss-win`),
};

// =============================================================================
// GAMES
// =============================================================================

export const games = {
  /** POST /api/games/:game/play */
  play: (game: string, body: Record<string, unknown>) =>
    http.post<ApiResponse<GameRound>>(`/api/games/${game}/play`, body),

  /** POST /api/games/:game/cashout */
  cashout: (game: string, body: Record<string, unknown>) =>
    http.post<ApiResponse<Record<string, unknown>>>(`/api/games/${game}/cashout`, body),

  /** GET /api/games/:game/current-round */
  currentRound: (game: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/games/${game}/current-round`),

  /** GET /api/games/history */
  history: (limit = 20) =>
    http.get<ApiResponse<GameRound[]>>(`/api/games/history${qs({ limit })}`),
};

// =============================================================================
// BOOKING CODES
// =============================================================================

export const booking = {
  /** POST /api/booking/redeem */
  redeem: (body: RedeemRequest) =>
    http.post<ApiResponse<RedeemResponse>>("/api/booking/redeem", body),

  /** GET /api/admin/booking-codes */
  list: (page = 0, size = 20) =>
    http.get<ApiResponse<PageResponse<BookingCode>>>(
      `/api/admin/booking-codes${qs({ page, size })}`
    ),

  /** POST /api/admin/booking-codes */
  create: (body: CreateBookingRequest) =>
    http.post<ApiResponse<BookingCode>>("/api/admin/booking-codes", body),

  /** GET /api/admin/booking-codes/:id */
  detail: (id: string) =>
    http.get<ApiResponse<BookingCode>>(`/api/admin/booking-codes/${id}`),
};

// =============================================================================
// PUBLIC MATCHES
// =============================================================================

export const publicMatches = {
  /** GET /api/public/matches */
  getAll: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/public/matches"),

  /** GET /api/public/matches/upcoming */
  upcoming: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/upcoming"),

  /** GET /api/public/matches/today */
  today: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/today"),

  /** GET /api/public/matches/live */
  live: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/live"),

  /** GET /api/public/matches/future */
  future: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/future"),

  /** GET /api/public/matches/results */
  results: (limit = 20) =>
    http.get<ApiResponse<Match[]>>(`/api/public/matches/results${qs({ limit })}`),

  /** GET /api/public/matches/featured */
  featured: () =>
    http.get<ApiResponse<Match[]>>("/api/public/matches/featured"),

  /** GET /api/public/matches/with-odds */
  withOdds: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/public/matches/with-odds"),

  /** GET /api/public/matches/with-all-odds */
  withAllOdds: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/public/matches/with-all-odds"),

  /** GET /api/public/matches/top6/upcoming */
  top6Upcoming: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/top6/upcoming"),

  /** GET /api/public/matches/top6/today */
  top6Today: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/top6/today"),

  /** GET /api/public/matches/top6/live */
  top6Live: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/top6/live"),

  /** GET /api/public/matches/cups/upcoming */
  cupsUpcoming: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/cups/upcoming"),

  /** GET /api/public/matches/cups/today */
  cupsToday: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/cups/today"),

  /** GET /api/public/matches/cups/live */
  cupsLive: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/cups/live"),

  /** GET /api/public/matches/all-cups/upcoming */
  allCupsUpcoming: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/all-cups/upcoming"),

  /** GET /api/public/matches/all-cups/today */
  allCupsToday: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/all-cups/today"),

  /** GET /api/public/matches/all-cups/live */
  allCupsLive: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/public/matches/all-cups/live"),

  /** GET /api/public/matches/:id */
  getById: (id: string) =>
    http.get<ApiResponse<Match>>(`/api/public/matches/${id}`),

  /** GET /api/public/matches/:id/stats */
  stats: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/matches/${id}/stats`),

  /** GET /api/public/matches/:id/prediction */
  prediction: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/matches/${id}/prediction`),

  /** GET /api/public/matches/:id/odds */
  odds: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/matches/${id}/odds`),

  /** GET /api/public/matches/:id/odds/all */
  oddsAll: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/matches/${id}/odds/all`),

  /** GET /api/public/matches/:id/odds/handicap */
  oddsHandicap: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/matches/${id}/odds/handicap`),

  /** GET /api/public/matches/:id/odds/half-time */
  oddsHalfTime: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/matches/${id}/odds/half-time`),

  /** GET /api/public/matches/:id/odds/correct-score */
  oddsCorrectScore: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/matches/${id}/odds/correct-score`),

  /** GET /api/public/matches/:id/lineups */
  lineups: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/matches/${id}/lineups`),

  /** GET /api/public/matches/:id/h2h */
  h2h: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/matches/${id}/h2h`),

  /** GET /api/public/matches/:id/events */
  events: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/matches/${id}/events`),

  /** GET /api/public/matches/:id/detail */
  detail: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/matches/${id}/detail`),
};

// =============================================================================
// PUBLIC — LEAGUES
// =============================================================================

export const publicLeagues = {
  /** GET /api/public/leagues/:league/upcoming */
  upcoming: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/leagues/${league}/upcoming`),

  /** GET /api/public/leagues/:league/today */
  today: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/leagues/${league}/today`),

  /** GET /api/public/leagues/:league/live */
  live: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/leagues/${league}/live`),

  /** GET /api/public/leagues/top6/:league/upcoming */
  top6Upcoming: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/leagues/top6/${league}/upcoming`),

  /** GET /api/public/leagues/top6/:league/today */
  top6Today: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/leagues/top6/${league}/today`),

  /** GET /api/public/leagues/top6/:league/live */
  top6Live: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/leagues/top6/${league}/live`),
};

// =============================================================================
// PUBLIC — CUPS
// =============================================================================

export const publicCups = {
  /** GET /api/public/cups/:cup/upcoming */
  upcoming: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/cups/${cup}/upcoming`),

  /** GET /api/public/cups/:cup/today */
  today: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/cups/${cup}/today`),

  /** GET /api/public/cups/:cup/live */
  live: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/cups/${cup}/live`),
};

// =============================================================================
// PUBLIC — TEAMS
// =============================================================================

export const publicTeams = {
  /** GET /api/public/teams/:team/upcoming */
  upcoming: (team: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/teams/${team}/upcoming`),

  /** GET /api/public/teams/:team/results */
  results: (team: string) =>
    http.get<ApiResponse<Match[]>>(`/api/public/teams/${team}/results`),

  /** GET /api/public/teams/:team/live */
  live: (team: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/public/teams/${team}/live`),
};

// =============================================================================
// PUBLIC — STANDINGS
// =============================================================================

export const publicStandings = {
  /** GET /api/public/standings/:competitionId */
  byCompetition: (competitionId: number) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/standings/${competitionId}`),

  /** GET /api/public/standings/top6 */
  top6: () =>
    http.get<ApiResponse<Record<string, Record<string, unknown>>>>("/api/public/standings/top6"),

  /** GET /api/public/standings/leagues/:league */
  byLeague: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/standings/leagues/${league}`),

  /** GET /api/public/standings/leagues/top6/:league */
  top6ByLeague: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/standings/leagues/top6/${league}`),

  /** GET /api/public/standings/cups/:cup */
  byCup: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/standings/cups/${cup}`),
};

// =============================================================================
// PUBLIC — SCORERS
// =============================================================================

export const publicScorers = {
  /** GET /api/public/scorers/:competitionId */
  byCompetition: (competitionId: number) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/scorers/${competitionId}`),

  /** GET /api/public/scorers/leagues/:league */
  byLeague: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/scorers/leagues/${league}`),

  /** GET /api/public/scorers/leagues/top6/:league */
  top6ByLeague: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/scorers/leagues/top6/${league}`),
};

// =============================================================================
// PUBLIC — ADMIN MATCHES
// =============================================================================

export const publicAdminMatches = {
  /** GET /api/public/admin-matches */
  getAll: () =>
    http.get<ApiResponse<Match[]>>("/api/public/admin-matches"),

  /** GET /api/public/admin-matches/upcoming */
  upcoming: () =>
    http.get<ApiResponse<Match[]>>("/api/public/admin-matches/upcoming"),

  /** GET /api/public/admin-matches/live */
  live: () =>
    http.get<ApiResponse<Match[]>>("/api/public/admin-matches/live"),

  /** GET /api/public/admin-matches/:id */
  getById: (id: string) =>
    http.get<ApiResponse<Match>>(`/api/public/admin-matches/${id}`),

  /** GET /api/public/admin-matches/:id/odds */
  odds: (id: string) =>
    http.get<ApiResponse<Odds[]>>(`/api/public/admin-matches/${id}/odds`),

  /** GET /api/public/admin-matches/:id/odds/all */
  oddsAll: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/public/admin-matches/${id}/odds/all`),
};

// =============================================================================
// PUBLIC — CONFIG & PREDICTIONS
// =============================================================================

export const publicConfig = {
  /** GET /api/public/config */
  get: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/public/config"),
};

export const publicPredictions = {
  /** GET /api/predictions/public */
  feed: (page = 0, size = 20) =>
    http.get<ApiResponse<PageResponse<AiPrediction>>>(
      `/api/predictions/public${qs({ page, size })}`
    ),

  /** GET /api/tip/:id */
  getTip: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/tip/${id}`),
};

// =============================================================================
// AUTHENTICATED MATCHES (non-public)
// =============================================================================

export const matches = {
  /** GET /api/matches/:id */
  getById: (id: string) =>
    http.get<ApiResponse<Match>>(`/api/matches/${id}`),

  /** GET /api/matches/upcoming */
  upcoming: () =>
    http.get<ApiResponse<Match[]>>("/api/matches/upcoming"),

  /** GET /api/matches/today */
  today: () =>
    http.get<ApiResponse<Match[]>>("/api/matches/today"),

  /** GET /api/matches/live */
  live: () =>
    http.get<ApiResponse<Match[]>>("/api/matches/live"),

  /** GET /api/matches/future */
  future: () =>
    http.get<ApiResponse<Match[]>>("/api/matches/future"),

  /** GET /api/matches/results */
  results: (limit = 20) =>
    http.get<ApiResponse<Match[]>>(`/api/matches/results${qs({ limit })}`),

  /** GET /api/matches/top6/upcoming */
  top6Upcoming: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/top6/upcoming"),

  /** GET /api/matches/top6/today */
  top6Today: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/top6/today"),

  /** GET /api/matches/top6/live */
  top6Live: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/top6/live"),

  /** GET /api/matches/cups/upcoming */
  cupsUpcoming: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/cups/upcoming"),

  /** GET /api/matches/cups/today */
  cupsToday: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/cups/today"),

  /** GET /api/matches/cups/live */
  cupsLive: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/cups/live"),

  /** GET /api/matches/all-cups/upcoming */
  allCupsUpcoming: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/all-cups/upcoming"),

  /** GET /api/matches/all-cups/today */
  allCupsToday: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/all-cups/today"),

  /** GET /api/matches/all-cups/live */
  allCupsLive: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/matches/all-cups/live"),

  /** GET /api/matches/:id/stats */
  stats: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/matches/${id}/stats`),

  /** GET /api/matches/:id/prediction */
  prediction: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/matches/${id}/prediction`),

  /** GET /api/matches/:id/odds */
  odds: (id: string) =>
    http.get<ApiResponse<Odds[]>>(`/api/matches/${id}/odds`),

  /** GET /api/matches/:id/odds/live */
  oddsLive: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/matches/${id}/odds/live`),

  /** GET /api/matches/:id/odds/all */
  oddsAll: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/matches/${id}/odds/all`),

  /** GET /api/matches/:id/odds/handicap */
  oddsHandicap: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/matches/${id}/odds/handicap`),

  /** GET /api/matches/:id/odds/half-time */
  oddsHalfTime: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/matches/${id}/odds/half-time`),

  /** GET /api/matches/:id/odds/correct-score */
  oddsCorrectScore: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/matches/${id}/odds/correct-score`),

  /** GET /api/matches/:id/lineups */
  lineups: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/matches/${id}/lineups`),

  /** GET /api/matches/:id/h2h */
  h2h: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/matches/${id}/h2h`),

  /** GET /api/matches/:id/events */
  events: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/matches/${id}/events`),

  /** GET /api/matches/:id/detail */
  detail: (id: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/matches/${id}/detail`),
};

// =============================================================================
// LIVESCORE
// =============================================================================

export const livescore = {
  /** GET /api/livescore/live */
  live: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/livescore/live"),

  /** GET /api/livescore/today */
  today: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/livescore/today"),

  /** GET /api/livescore/fixtures */
  fixtures: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/livescore/fixtures"),

  /** GET /api/livescore/top6/live */
  top6Live: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/livescore/top6/live"),

  /** GET /api/livescore/top6/fixtures */
  top6Fixtures: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/livescore/top6/fixtures"),

  /** GET /api/livescore/top6/all-fixtures */
  top6AllFixtures: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/livescore/top6/all-fixtures"),

  /** GET /api/livescore/leagues/top6/:league/live */
  top6LeagueLive: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/livescore/leagues/top6/${league}/live`),

  /** GET /api/livescore/leagues/top6/:league/fixtures */
  top6LeagueFixtures: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/livescore/leagues/top6/${league}/fixtures`),

  /** GET /api/livescore/cups/live */
  cupsLive: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/livescore/cups/live"),

  /** GET /api/livescore/cups/fixtures */
  cupsFixtures: () =>
    http.get<ApiResponse<Record<string, unknown>[]>>("/api/livescore/cups/fixtures"),

  /** GET /api/livescore/cups/:cup/live */
  cupLive: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/livescore/cups/${cup}/live`),

  /** GET /api/livescore/cups/:cup/fixtures */
  cupFixtures: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/livescore/cups/${cup}/fixtures`),
};

// =============================================================================
// STANDINGS (authenticated)
// =============================================================================

export const standings = {
  /** GET /api/standings/:competitionId */
  byCompetition: (competitionId: number) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/standings/${competitionId}`),

  /** GET /api/standings/top6 */
  top6: () =>
    http.get<ApiResponse<Record<string, Record<string, unknown>>>>("/api/standings/top6"),

  /** GET /api/standings/leagues/:league */
  byLeague: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/standings/leagues/${league}`),

  /** GET /api/standings/leagues/top6/:league */
  top6ByLeague: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/standings/leagues/top6/${league}`),

  /** GET /api/standings/cups/:cup */
  byCup: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/standings/cups/${cup}`),
};

// =============================================================================
// SCORERS (authenticated)
// =============================================================================

export const scorers = {
  /** GET /api/scorers/:competitionId */
  byCompetition: (competitionId: number) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/scorers/${competitionId}`),

  /** GET /api/scorers/leagues/:league */
  byLeague: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/scorers/leagues/${league}`),

  /** GET /api/scorers/leagues/top6/:league */
  top6ByLeague: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/scorers/leagues/top6/${league}`),
};

// =============================================================================
// TEAMS (authenticated)
// =============================================================================

export const teams = {
  /** GET /api/teams/name/:team/upcoming */
  upcoming: (team: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/teams/name/${team}/upcoming`),

  /** GET /api/teams/name/:team/results */
  results: (team: string) =>
    http.get<ApiResponse<Match[]>>(`/api/teams/name/${team}/results`),

  /** GET /api/teams/name/:team/live */
  live: (team: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/teams/name/${team}/live`),

  /** GET /api/teams/id/:teamId/matches */
  matchesById: (teamId: number) =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/teams/id/${teamId}/matches`),

  /** GET /api/teams/id/:teamId/live */
  liveById: (teamId: number) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/teams/id/${teamId}/live`),

  /** GET /api/teams/id/:teamId/fixtures */
  fixturesById: (teamId: number) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/teams/id/${teamId}/fixtures`),
};

// =============================================================================
// LEAGUES (authenticated)
// =============================================================================

export const leagues = {
  /** GET /api/leagues/:league/upcoming */
  upcoming: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/leagues/${league}/upcoming`),

  /** GET /api/leagues/:league/today */
  today: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/leagues/${league}/today`),

  /** GET /api/leagues/:league/live */
  live: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/leagues/${league}/live`),

  /** GET /api/leagues/top6/:league/upcoming */
  top6Upcoming: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/leagues/top6/${league}/upcoming`),

  /** GET /api/leagues/top6/:league/today */
  top6Today: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/leagues/top6/${league}/today`),

  /** GET /api/leagues/top6/:league/live */
  top6Live: (league: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/leagues/top6/${league}/live`),
};

// =============================================================================
// CUPS (authenticated)
// =============================================================================

export const cups = {
  /** GET /api/cups/:cup/upcoming */
  upcoming: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/cups/${cup}/upcoming`),

  /** GET /api/cups/:cup/today */
  today: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/cups/${cup}/today`),

  /** GET /api/cups/:cup/live */
  live: (cup: string) =>
    http.get<ApiResponse<Record<string, unknown>[]>>(`/api/cups/${cup}/live`),
};

// =============================================================================
// AFFILIATE (user)
// =============================================================================

export const affiliate = {
  /** GET /api/affiliate/stats */
  getStats: () =>
    http.get<ApiResponse<AffiliateStatsDTO>>("/api/affiliate/stats"),

  /** GET /api/affiliate/balance */
  getBalance: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/affiliate/balance"),

  /** GET /api/affiliate/referred-users */
  getReferredUsers: () =>
    http.get<ApiResponse<ReferredUserDTO[]>>("/api/affiliate/referred-users"),

  /** GET /api/affiliate/links */
  getLinks: () =>
    http.get<ApiResponse<ReferralLink[]>>("/api/affiliate/links"),

  /** POST /api/affiliate/links */
  createLink: (body: CreateLinkRequest) =>
    http.post<ApiResponse<ReferralLink>>("/api/affiliate/links", body),

  /** GET /api/affiliate/withdrawals */
  getWithdrawals: (page = 0, size = 20) =>
    http.get<ApiResponse<PageResponse<AffiliateWithdrawalRequest>>>(
      `/api/affiliate/withdrawals${qs({ page, size })}`
    ),

  /** POST /api/affiliate/withdraw */
  requestWithdrawal: (body: WithdrawalRequestDTO) =>
    http.post<ApiResponse<AffiliateWithdrawalRequest>>("/api/affiliate/withdraw", body),
};

// =============================================================================
// ADMIN — MATCHES
// =============================================================================

export const adminMatches = {
  /** GET /api/admin/matches */
  list: () =>
    http.get<ApiResponse<Match[]>>("/api/admin/matches"),

  /** POST /api/admin/matches */
  create: (body: AdminMatchRequest) =>
    http.post<ApiResponse<Match>>("/api/admin/matches", body),

  /** GET /api/admin/matches/:id */
  getById: (id: string) =>
    http.get<ApiResponse<Match>>(`/api/admin/matches/${id}`),

  /** PATCH /api/admin/matches/:id/status */
  updateStatus: (id: string, body: AdminStatusUpdateRequest) =>
    http.patch<ApiResponse<Match>>(`/api/admin/matches/${id}/status`, body),

  /** PATCH /api/admin/matches/:id/score */
  updateScore: (id: string, body: AdminScoreUpdateRequest) =>
    http.patch<ApiResponse<Match>>(`/api/admin/matches/${id}/score`, body),
};

// =============================================================================
// ADMIN — PREDICTIONS
// =============================================================================

export const adminPredictions = {
  /** GET /api/admin/predictions */
  list: (page = 0, size = 20) =>
    http.get<ApiResponse<PageResponse<AiPrediction>>>(
      `/api/admin/predictions${qs({ page, size })}`
    ),

  /** POST /api/admin/predictions/run */
  run: (body: Record<string, string>) =>
    http.post<ApiResponse<AiPrediction>>("/api/admin/predictions/run", body),

  /** POST /api/admin/predictions/:id/share */
  share: (id: string) =>
    http.post<ApiResponse<AiPrediction>>(`/api/admin/predictions/${id}/share`),

  /** POST /api/admin/predictions/:id/unpublish */
  unpublish: (id: string) =>
    http.post<ApiResponse<AiPrediction>>(`/api/admin/predictions/${id}/unpublish`),
};

// =============================================================================
// ADMIN — CRASH GAME SCHEDULE
// =============================================================================

export const adminCrash = {
  /** GET /api/admin/crash/schedule/:game */
  schedule: (game: string, limit = 10) =>
    http.get<ApiResponse<GameCrashSchedule[]>>(
      `/api/admin/crash/schedule/${game}${qs({ limit })}`
    ),

  /** POST /api/admin/crash/schedule/:game/generate */
  generate: (game: string) =>
    http.post<ApiResponse<void>>(`/api/admin/crash/schedule/${game}/generate`),

  /** PATCH /api/admin/crash/schedule/:id/override */
  override: (id: string, body: Record<string, unknown>) =>
    http.patch<ApiResponse<GameCrashSchedule>>(`/api/admin/crash/schedule/${id}/override`, body),

  /** GET /api/admin/crash/history/:game */
  history: (game: string, page = 0, size = 50) =>
    http.get<ApiResponse<PageResponse<GameCrashSchedule>>>(
      `/api/admin/crash/history/${game}${qs({ page, size })}`
    ),
};

// =============================================================================
// ADMIN — AFFILIATE
// =============================================================================

export const adminAffiliate = {
  /** GET /api/admin/affiliate/stats */
  getStats: () =>
    http.get<ApiResponse<AffiliateStatsDTO>>("/api/admin/affiliate/stats"),

  /** GET /api/admin/affiliate/referred-users */
  getReferredUsers: () =>
    http.get<ApiResponse<ReferredUserDTO[]>>("/api/admin/affiliate/referred-users"),

  /** GET /api/admin/affiliate/links */
  getLinks: () =>
    http.get<ApiResponse<ReferralLink[]>>("/api/admin/affiliate/links"),

  /** POST /api/admin/affiliate/links */
  createLink: (body: CreateLinkRequest) =>
    http.post<ApiResponse<ReferralLink>>("/api/admin/affiliate/links", body),

  /** GET /api/admin/affiliate/payout-window */
  getPayoutWindow: () =>
    http.get<ApiResponse<Record<string, boolean>>>("/api/admin/affiliate/payout-window"),

  /** POST /api/admin/affiliate/payout-request */
  requestPayout: () =>
    http.post<ApiResponse<PayoutRequest>>("/api/admin/affiliate/payout-request"),

  /** GET /api/admin/affiliate/payout-requests */
  getPayoutHistory: (page = 0, size = 20) =>
    http.get<ApiResponse<PageResponse<PayoutRequest>>>(
      `/api/admin/affiliate/payout-requests${qs({ page, size })}`
    ),
};

// =============================================================================
// ADMIN — REFERRAL LINKS
// =============================================================================

export const adminReferralLinks = {
  /** GET /api/admin/referral-links */
  list: () =>
    http.get<ApiResponse<ReferralLink[]>>("/api/admin/referral-links"),

  /** POST /api/admin/referral-links */
  create: (body: Record<string, unknown>) =>
    http.post<ApiResponse<ReferralLink>>("/api/admin/referral-links", body),

  /** GET /api/admin/referred-users */
  getReferredUsers: () =>
    http.get<ApiResponse<ReferredUserDTO[]>>("/api/admin/referred-users"),
};

// =============================================================================
// ADMIN — ANALYTICS & AUDIT
// =============================================================================

export const adminAnalytics = {
  /** GET /api/admin/analytics */
  get: (range = "7d") =>
    http.get<ApiResponse<Record<string, unknown>>>(`/api/admin/analytics${qs({ range })}`),

  /** GET /api/admin/audit-log */
  auditLog: (page = 0, size = 50) =>
    http.get<ApiResponse<PageResponse<AuditLog>>>(
      `/api/admin/audit-log${qs({ page, size })}`
    ),
};

// =============================================================================
// ADMIN UPGRADE CHATS (user-facing)
// =============================================================================

export const upgradeChats = {
  /** GET /api/upgrade-chats/:chatId/messages */
  getMessages: (chatId: string) =>
    http.get<ApiResponse<AdminUpgradeChatMessageDto[]>>(`/api/upgrade-chats/${chatId}/messages`),

  /** POST /api/upgrade-chats/:chatId/messages */
  sendMessage: (chatId: string, body: SendMessageRequest) =>
    http.post<ApiResponse<AdminUpgradeChatMessageDto>>(`/api/upgrade-chats/${chatId}/messages`, body),
};

// =============================================================================
// ADMIN UPGRADE — PAYSTACK INIT
// =============================================================================

export const adminUpgrade = {
  /** POST /api/user/upgrade-to-admin/paystack/init */
  initPaystack: () =>
    http.post<ApiResponse<Record<string, unknown>>>("/api/user/upgrade-to-admin/paystack/init"),
};

// =============================================================================
// SUPER ADMIN — UPGRADE CHATS
// =============================================================================

export const superAdminUpgradeChats = {
  /** GET /api/super-admin/upgrade-chats */
  getAll: () =>
    http.get<ApiResponse<AdminUpgradeChatDto[]>>("/api/super-admin/upgrade-chats"),

  /** GET /api/super-admin/upgrade-chats/pending */
  getPending: () =>
    http.get<ApiResponse<AdminUpgradeChatDto[]>>("/api/super-admin/upgrade-chats/pending"),

  /** GET /api/super-admin/upgrade-chats/:chatId/messages */
  getMessages: (chatId: string) =>
    http.get<ApiResponse<AdminUpgradeChatMessageDto[]>>(`/api/super-admin/upgrade-chats/${chatId}/messages`),

  /** POST /api/super-admin/upgrade-chats/:chatId/messages */
  sendMessage: (chatId: string, body: SendMessageRequest) =>
    http.post<ApiResponse<AdminUpgradeChatMessageDto>>(`/api/super-admin/upgrade-chats/${chatId}/messages`, body),

  /** POST /api/super-admin/upgrade-chats/:chatId/set-commission */
  setCommission: (chatId: string, body: SetCommissionRequest) =>
    http.post<ApiResponse<AdminUpgradeChatDto>>(`/api/super-admin/upgrade-chats/${chatId}/set-commission`, body),
};

// =============================================================================
// SUPER ADMIN — PAYOUT REQUESTS
// =============================================================================

export const superAdminPayouts = {
  /** GET /api/super-admin/payout-requests */
  getPending: () =>
    http.get<ApiResponse<PayoutRequest[]>>("/api/super-admin/payout-requests"),

  /** POST /api/super-admin/payout-requests/:id/approve */
  approve: (id: string) =>
    http.post<ApiResponse<PayoutRequest>>(`/api/super-admin/payout-requests/${id}/approve`),

  /** POST /api/super-admin/payout-requests/:id/reject */
  reject: (id: string, body: Record<string, string>) =>
    http.post<ApiResponse<PayoutRequest>>(`/api/super-admin/payout-requests/${id}/reject`, body),

  /** POST /api/super-admin/payout-requests/:id/mark-paid */
  markPaid: (id: string) =>
    http.post<ApiResponse<PayoutRequest>>(`/api/super-admin/payout-requests/${id}/mark-paid`),
};

// =============================================================================
// SUPER ADMIN — AFFILIATE WITHDRAWALS
// =============================================================================

export const superAdminAffiliateWithdrawals = {
  /** GET /api/super-admin/affiliate-withdrawals/pending */
  getPending: () =>
    http.get<ApiResponse<AffiliateWithdrawalRequest[]>>("/api/super-admin/affiliate-withdrawals/pending"),

  /** POST /api/super-admin/affiliate-withdrawals/:id/process */
  process: (id: string) =>
    http.post<ApiResponse<AffiliateWithdrawalRequest>>(`/api/super-admin/affiliate-withdrawals/${id}/process`),

  /** POST /api/super-admin/affiliate-withdrawals/:id/reject */
  reject: (id: string, body: Record<string, string>) =>
    http.post<ApiResponse<AffiliateWithdrawalRequest>>(`/api/super-admin/affiliate-withdrawals/${id}/reject`, body),
};

// =============================================================================
// SUPER ADMIN — ADMINS, METRICS, PREDICTIONS, AUDIT
// =============================================================================

export const superAdmin = {
  /** GET /api/super-admin/admins */
  listAdmins: () =>
    http.get<ApiResponse<User[]>>("/api/super-admin/admins"),

  /** POST /api/super-admin/admins */
  createAdmin: (body: Record<string, string>) =>
    http.post<ApiResponse<User>>("/api/super-admin/admins", body),

  /** GET /api/super-admin/metrics */
  metrics: () =>
    http.get<ApiResponse<Record<string, unknown>>>("/api/super-admin/metrics"),

  /** GET /api/super-admin/audit-log */
  auditLog: (page = 0, size = 50) =>
    http.get<ApiResponse<PageResponse<AuditLog>>>(
      `/api/super-admin/audit-log${qs({ page, size })}`
    ),

  /** GET /api/super-admin/predictions */
  predictions: (page = 0, size = 50) =>
    http.get<ApiResponse<PageResponse<AiPrediction>>>(
      `/api/super-admin/predictions${qs({ page, size })}`
    ),
};

// =============================================================================
// Default export — all namespaces bundled
// =============================================================================

const api = {
  auth,
  user,
  wallet,
  withdrawals,
  deposits,
  webhooks,
  bets,
  games,
  booking,
  publicMatches,
  publicLeagues,
  publicCups,
  publicTeams,
  publicStandings,
  publicScorers,
  publicAdminMatches,
  publicConfig,
  publicPredictions,
  matches,
  livescore,
  standings,
  scorers,
  teams,
  leagues,
  cups,
  affiliate,
  adminMatches,
  adminPredictions,
  adminCrash,
  adminAffiliate,
  adminReferralLinks,
  adminAnalytics,
  upgradeChats,
  adminUpgrade,
  superAdminUpgradeChats,
  superAdminPayouts,
  superAdminAffiliateWithdrawals,
  superAdmin,
};

export default api;