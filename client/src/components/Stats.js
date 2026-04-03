import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faUserCheck, faPercent, faUserXmark, faHourglass, faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/helpers';

const CARDS = (stats, totalIncome) => [
  {
    label: 'Total Members',
    value: stats.totalMembers || 0,
    icon: faUsers,
    color: 'blue',
  },
  {
    label: 'Official Members',
    value: stats.officialMembers || 0,
    icon: faUserCheck,
    color: 'green',
  },
  {
    label: 'Collection Rate',
    value: stats.totalMembers > 0
      ? `${Math.round((stats.paidMembers / stats.totalMembers) * 100)}%`
      : '0%',
    icon: faPercent,
    color: 'emerald',
  },
  {
    label: 'Unpaid Members',
    value: stats.unpaidMembers || 0,
    icon: faUserXmark,
    color: 'red',
  },
  {
    label: 'Pending',
    value: stats.pendingMembers || 0,
    icon: faHourglass,
    color: 'amber',
  },
  {
    label: 'Total Revenue',
    value: formatCurrency(totalIncome !== null ? totalIncome : (stats.totalRevenue || 0)),
    icon: faWallet,
    color: 'purple',
    isCurrency: true,
  },
];

const Stats = ({ stats, totalIncome }) => {
  return (
    <div className="stats-grid">
      {CARDS(stats, totalIncome).map(({ label, value, icon, color }) => (
        <div key={label} className={`stat-card stat-card--${color}`}>
          <div className="stat-card-icon-badge">
            <FontAwesomeIcon icon={icon} />
          </div>
          <p className="stat-card-label">{label}</p>
          <p className="stat-card-value">{value}</p>
        </div>
      ))}
    </div>
  );
};

export default Stats;
