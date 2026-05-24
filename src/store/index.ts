import { create } from 'zustand';
import type { User, BetSlipSelection, Bet, Transaction } from '../types';
import { mockBets, mockTransactions } from '../data/mock';

type Theme =
  | 'nxtbet-primary'
  | 'nxtbet-dark';

interface AppState {
  user: User | null;
  betSlip: BetSlipSelection[];
  bets: Bet[];
  mainWalletBalance: number;
  affiliateWalletBalance: number;
  transactions: Transaction[];
  theme: Theme;
  isAdminModalOpen: boolean;
  modalOpen: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  login: (user: User) => void;
  logout: () => void;
  addToBetSlip: (selection: BetSlipSelection) => void;
  removeFromBetSlip: (matchId: string, market: string, selection: string) => void;
  clearBetSlip: () => void;
  placeBet: (stake: number) => void;
  toggleTheme: () => void;
  setAdminModalOpen: (open: boolean) => void;
  setModalOpen: (open: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
  withdrawAffiliate: (amount: number) => void;
}

const allowedThemes: Theme[] = ['nxtbet-primary', 'nxtbet-dark'];
const savedTheme = localStorage.getItem('theme') as Theme;
const initialTheme: Theme = allowedThemes.includes(savedTheme) ? savedTheme : 'nxtbet-primary';

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  betSlip: [],
  bets: mockBets,
  mainWalletBalance: 1250.00,
  affiliateWalletBalance: 820.00,
  transactions: mockTransactions,
  theme: initialTheme,
  isAdminModalOpen: false,
  modalOpen: false,
  toast: null,

  login: (user) => set({ user }),
  logout: () => set({ user: null, betSlip: [] }),

  addToBetSlip: (selection) => {
    const { betSlip } = get();
    const exists = betSlip.find(
      (s) => s.matchId === selection.matchId && s.market === selection.market && s.selection === selection.selection
    );
    if (exists) {
      set({ betSlip: betSlip.filter((s) => !(s.matchId === selection.matchId && s.market === selection.market && s.selection === selection.selection)) });
    } else {
      const filtered = betSlip.filter((s) => !(s.matchId === selection.matchId && s.market === selection.market));
      set({ betSlip: [...filtered, selection] });
    }
  },

  removeFromBetSlip: (matchId, market, selection) => {
    set({ betSlip: get().betSlip.filter((s) => !(s.matchId === matchId && s.market === market && s.selection === selection)) });
  },

  clearBetSlip: () => set({ betSlip: [] }),

  placeBet: (stake) => {
    const { betSlip, mainWalletBalance, bets } = get();
    if (betSlip.length === 0 || stake <= 0 || stake > mainWalletBalance) {
      get().showToast('Invalid bet amount or empty bet slip.', 'error');
      return;
    }
    const totalOdds = betSlip.reduce((acc, s) => acc * s.odd, 1);
    const newBet: Bet = {
      id: `b${Date.now()}`,
      selections: [...betSlip],
      stake,
      totalOdds: Math.round(totalOdds * 100) / 100,
      potentialReturn: Math.round(stake * totalOdds * 100) / 100,
      status: 'pending',
      placedAt: new Date().toISOString(),
    };
    set((state) => ({
      bets: [newBet, ...state.bets],
      betSlip: [],
      mainWalletBalance: Math.round((mainWalletBalance - stake) * 100) / 100,
      transactions: [
        { id: `t${Date.now()}`, type: 'bet_loss', amount: stake, description: 'Bet Placed', date: new Date().toISOString().split('T')[0], status: 'completed' },
        ...state.transactions,
      ],
    }));
    get().showToast('Bet placed successfully!', 'success');
  },

  toggleTheme: () =>
    set((state) => {
      const themeOrder: Theme[] = ['nxtbet-primary', 'nxtbet-dark'];
      const currentIndex = themeOrder.indexOf(state.theme);
      const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('theme', nextTheme);
      return { theme: nextTheme };
    }),

  setAdminModalOpen: (open) => set({ isAdminModalOpen: open }),

  setModalOpen: (open) => set({ modalOpen: open }),

  showToast: (message, type) => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  clearToast: () => set({ toast: null }),

  deposit: (amount) => {
    if (amount <= 0) {
      get().showToast('Deposit amount must be positive.', 'error');
      return;
    }
    set((s) => ({
      mainWalletBalance: Math.round((s.mainWalletBalance + amount) * 100) / 100,
      transactions: [
        { id: `t${Date.now()}`, type: 'deposit', amount, description: 'Deposit', date: new Date().toISOString().split('T')[0], status: 'completed' },
        ...s.transactions,
      ],
    }));
    get().showToast('Deposit successful!', 'success');
  },

  withdraw: (amount) => {
    const { mainWalletBalance } = get();
    if (amount <= 0) {
      get().showToast('Withdrawal amount must be positive.', 'error');
      return;
    }
    if (amount > mainWalletBalance) {
      get().showToast('Insufficient balance for withdrawal.', 'error');
      return;
    }
    set((s) => ({
      mainWalletBalance: Math.round((s.mainWalletBalance - amount) * 100) / 100,
      transactions: [
        { id: `t${Date.now()}`, type: 'withdrawal', amount, description: 'Withdrawal', date: new Date().toISOString().split('T')[0], status: 'completed' },
        ...s.transactions,
      ],
    }));
    get().showToast('Withdrawal successful!', 'success');
  },

  withdrawAffiliate: (amount) => {
    const { affiliateWalletBalance } = get();
    if (amount <= 0) {
      get().showToast('Affiliate withdrawal amount must be positive.', 'error');
      return;
    }
    if (amount > affiliateWalletBalance) {
      get().showToast('Insufficient affiliate balance for withdrawal.', 'error');
      return;
    }
    set((s) => ({
      affiliateWalletBalance: Math.round((s.affiliateWalletBalance - amount) * 100) / 100,
      transactions: [
        { id: `t${Date.now()}`, type: 'affiliate', amount, description: 'Affiliate Withdrawal', date: new Date().toISOString().split('T')[0], status: 'completed' },
        ...s.transactions,
      ],
    }));
    get().showToast('Affiliate withdrawal successful!', 'success');
  },
}));