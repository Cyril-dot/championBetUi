import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import HomeIcon from '@mui/icons-material/Home';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const navItems = [
  { to: '/',        label: 'Home',     icon: <HomeIcon fontSize="medium" /> },
  { to: '/live',    label: 'Sports',   icon: <SportsSoccerIcon fontSize="medium" /> },
  { to: '/betslip', label: 'Bet Slip', icon: <ReceiptLongIcon fontSize="medium" /> },
  { to: '/account', label: 'Account',  icon: <AccountCircleIcon fontSize="medium" /> },
];

export default function BottomNav() {
  const location = useLocation();
  const betSlip   = useAppStore((s) => s.betSlip);
  const modalOpen = useAppStore((s) => s.modalOpen);

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 ease-in-out ${
        modalOpen ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{
        background: '#000000',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: isActive ? '#CC0000' : 'rgba(255,255,255,0.45)' }}
            >
              <div className="relative">
                {item.icon}
                {item.to === '/betslip' && betSlip.length > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 text-white font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5"
                    style={{ background: '#CC0000', fontSize: '9px' }}
                  >
                    {betSlip.length}
                  </span>
                )}
              </div>
              <span
                className="leading-none"
                style={{ fontSize: '11px', fontWeight: isActive ? 800 : 500 }}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{ width: 4, height: 4, borderRadius: '50%', background: '#CC0000' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}