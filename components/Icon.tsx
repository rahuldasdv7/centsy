import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  name: 'home' | 'budget' | 'debt' | 'advisor' | 'plus' | 'chevron';
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = '#16160f', strokeWidth = 1.85 }: IconProps) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };

  switch (name) {
    case 'home':
      return (
        <Svg {...props}>
          <Path
            d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'budget':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M12 7.5v9M8.5 9.5h5a1.8 1.8 0 010 3.6h-3a1.8 1.8 0 000 3.6h5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'debt':
      return (
        <Svg {...props}>
          <Path
            d="M3 17l6-6 4 4 8-8M21 7v5M21 7h-5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'advisor':
      return (
        <Svg {...props}>
          <Path
            d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...props}>
          <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg {...props}>
          <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
}