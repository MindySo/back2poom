import React from 'react';
import { theme } from '../../../theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'time' | 'feature' | 'solved' | 'alert' | 'ai' | 'radius_max' | 'radius_info';
  size?: 'xs' | 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
  style,
  theme: themeMode = 'light',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'time':
        return {
          backgroundColor: themeMode === 'dark' ? theme.colors.policeBlue + '33' : theme.colors.blue + '33',
          color: themeMode === 'dark' ? theme.colors.policeBlue : theme.colors.blue,
          border: `2px solid ${themeMode === 'dark' ? theme.colors.policeBlue : theme.colors.blue}`,
        };
      case 'solved':
        return {
          backgroundColor: themeMode === 'dark' ? theme.colors.policeGreen + '33' : theme.colors.green + '33',
          color: themeMode === 'dark' ? theme.colors.policeGreen : theme.colors.green,
          border: `2px solid ${themeMode === 'dark' ? theme.colors.policeGreen : theme.colors.green}`,
        };
      case 'feature':
        return {
          backgroundColor: themeMode === 'dark' ? theme.colors.policePink + '33' : theme.colors.pink + '33',
          color: themeMode === 'dark' ? theme.colors.policePink : theme.colors.pink,
          border: `2px solid ${themeMode === 'dark' ? theme.colors.policePink : theme.colors.pink}`,
        };
      case 'alert':
        return {
          backgroundColor: themeMode === 'dark' ? theme.colors.policeYellow + '33' : theme.colors.yellow + '33',
          color: themeMode === 'dark' ? theme.colors.policeYellow : theme.colors.yellow,
          border: `2px solid ${themeMode === 'dark' ? theme.colors.policeYellow : theme.colors.yellow}`,
        };
      case 'ai':
        return {
          backgroundColor: theme.colors.white + '33',
          color: theme.colors.rainbow,
          border: `2px solid ${theme.colors.rainbow}`,
        };
      case 'radius_max':
        return {
          backgroundColor: '#E55A5A',
          color: '#EEF1F6',
          border: `2px solid #E55A5A`,
        };
      case 'radius_info':
        return {
          backgroundColor: '#0B72E7',
          color: '#EEF1F6',
          border: `2px solid #0B72E7`,
        };
      default:
        return {
          backgroundColor: themeMode === 'dark' ? theme.colors.policeBlue + '33' : theme.colors.blue + '33',
          color: themeMode === 'dark' ? theme.colors.policeBlue : theme.colors.blue,
          border: `1px solid ${themeMode === 'dark' ? theme.colors.policeBlue : theme.colors.blue}`,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return {
          padding: `${theme.spacing.xxs} ${theme.spacing.xs}`,
          fontSize: theme.typography.fontSize.xxs,
          borderRadius: theme.borderRadius.lg,
      };
      case 'small':
        return {
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          fontSize: theme.typography.fontSize.xs,
          borderRadius: theme.borderRadius.xl,
        };
      case 'medium':
        return {
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          fontSize: theme.typography.fontSize.sm,
          borderRadius: theme.borderRadius.xxl,
        };
      case 'large':
        return {
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          fontSize: theme.typography.fontSize.md,
          borderRadius: theme.borderRadius.full,
        };
      default:
        return {
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          fontSize: theme.typography.fontSize.sm,
          borderRadius: theme.borderRadius.xxl,
        };
    }
  };

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: theme.typography.fontWeight.medium,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: theme.typography.lineHeight.tight,
    whiteSpace: 'nowrap',
  };

  const styles = {
    ...baseStyles,
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <span style={styles} className={className}>
      {children}
    </span>
  );
};

export default Badge;
