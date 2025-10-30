import React from 'react';
import { theme } from '../../../theme';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'darkPrimary' | 'darkSecondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  fullWidth = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? theme.colors.lightGray : theme.colors.main,
          color: disabled ? theme.colors.gray : theme.colors.beige,
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.beige,
          color: theme.colors.main,
          border: `none`,
        };
      case 'darkPrimary':
        return {
          backgroundColor: disabled ? theme.colors.lightGray : theme.colors.darkMain,
          color: theme.colors.white,
          border: 'none',
        };
      case 'darkSecondary':
        return {
          backgroundColor: theme.colors.lightGray,
          color: theme.colors.gray,
          border: 'none',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          fontSize: theme.typography.fontSize.sm,
        };
      case 'medium':
        return {
          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
          fontSize: theme.typography.fontSize.md,
        };
      case 'large':
        return {
          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
          fontSize: theme.typography.fontSize.lg,
        };
      default:
        return {
          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
          fontSize: theme.typography.fontSize.md,
        };
    }
  };

  const baseStyles = {
    borderRadius: theme.borderRadius.md,
    fontWeight: theme.typography.fontWeight.medium,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: theme.typography.fontFamily.primary,
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    width: fullWidth ? '100%' : 'auto',
  };

  const styles = {
    ...baseStyles,
    ...getVariantStyles(),
    ...getSizeStyles(),
  };

  return (
    <button
      type={type}
      style={styles}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
};

export default Button;
