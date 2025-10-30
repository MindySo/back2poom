import React from 'react';
import { theme } from '../../../theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'time' | 'feature' | 'solved' | 'alert' | 'ai';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
  style,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'time':
        return {
          backgroundColor: theme.colors.blue + '33',
          color: theme.colors.blue,
          border: `2px solid ${theme.colors.blue}`,
        };
      case 'solved':
        return {
          backgroundColor: theme.colors.green + '33',
          color: theme.colors.green,
          border: `2px solid ${theme.colors.green}`,
        };
      case 'feature':
        return {
          backgroundColor: theme.colors.pink + '33',
          color: theme.colors.pink,
          border: `2px solid ${theme.colors.pink}`,
        };
      case 'alert':
        return {
          backgroundColor: theme.colors.yellow + '33',
          color: theme.colors.yellow,
          border: `2px solid ${theme.colors.yellow}`,
        };
      case 'ai':
        return {
          backgroundColor: theme.colors.white + '33',
          color: theme.colors.rainbow,
          border: `2px solid ${theme.colors.rainbow}`,
        };
      default:
        return {
          backgroundColor: theme.colors.blue + '33',
          color: theme.colors.blue,
          border: `1px solid ${theme.colors.blue}`,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          fontSize: theme.typography.fontSize.xs,
          borderRadius: theme.borderRadius.lg,
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
          borderRadius: theme.borderRadius.lg,
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
