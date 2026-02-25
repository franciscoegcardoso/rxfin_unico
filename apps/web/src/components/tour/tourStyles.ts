import { Styles } from 'react-joyride';

export const joyrideStyles: Partial<Styles> = {
  options: {
    zIndex: 10000,
    primaryColor: 'hsl(142.1, 76.2%, 36.3%)', // --primary
    backgroundColor: 'hsl(0, 0%, 100%)',
    textColor: 'hsl(240, 10%, 3.9%)',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    arrowColor: 'hsl(0, 0%, 100%)',
  },
  buttonNext: {
    backgroundColor: 'hsl(142.1, 76.2%, 36.3%)',
    borderRadius: '9999px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 16px',
  },
  buttonBack: {
    color: 'hsl(240, 3.8%, 46.1%)',
    marginRight: '8px',
    fontSize: '14px',
  },
  buttonSkip: {
    color: 'hsl(240, 3.8%, 46.1%)',
    fontSize: '13px',
  },
  buttonClose: {
    color: 'hsl(240, 3.8%, 46.1%)',
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: 'hsl(240, 3.8%, 46.1%)',
  },
  spotlight: {
    borderRadius: '12px',
  },
  beacon: {
    display: 'none',
  },
  beaconInner: {
    backgroundColor: 'hsl(142.1, 76.2%, 36.3%)',
  },
  beaconOuter: {
    backgroundColor: 'hsla(142.1, 76.2%, 36.3%, 0.2)',
    border: '2px solid hsl(142.1, 76.2%, 36.3%)',
  },
};
