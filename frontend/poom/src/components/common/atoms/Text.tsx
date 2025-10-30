import React from 'react';
import { theme } from '../../../theme';

export interface TextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'display' | 'hero';
  responsiveSize?: {
    default: TextProps['size'];
    mobile: TextProps['size'];
  };
  color?: keyof typeof theme.colors;
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?:
    | 'thin'
    | 'extraLight'
    | 'light'
    | 'regular'
    | 'medium'
    | 'semiBold'
    | 'bold'
    | 'extraBold'
    | 'black';
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  style?: React.CSSProperties;
}

const Text: React.FC<TextProps> = ({
  children,
  size = 'md',
  color = 'black',
  align = 'left',
  weight = 'regular',
  className = '',
  as,
  style,
  responsiveSize,
}) => {
  const getSizeStyles = () => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 9999;

    const finalSize = responsiveSize
      ? screenWidth <= 375
        ? responsiveSize.mobile
        : responsiveSize.default
      : size;

    return {
      fontSize: theme.typography.fontSize[finalSize as keyof typeof theme.typography.fontSize],
      fontWeight: theme.typography.fontWeight[weight],
      lineHeight: theme.typography.lineHeight.normal,
      fontFamily: theme.typography.fontFamily.primary,
    };
  };

  const getColorStyles = () => {
    return { color: theme.colors[color] };
  };

  const baseStyles = {
    textAlign: align,
    margin: 0,
    padding: 0,
  };

  const styles = {
    ...baseStyles,
    ...getSizeStyles(),
    ...getColorStyles(),
    ...style,
  };

  const getElementType = () => {
    if (as) return as;
    switch (size) {
      case 'hero':
      case 'display':
      case 'xxxl':
        return 'h1';
      case 'xxl':
        return 'h2';
      case 'xl':
        return 'h3';
      case 'lg':
        return 'h4';
      default:
        return 'p';
    }
  };

  const ElementType = getElementType();

  return (
    <ElementType style={styles} className={className}>
      {children}
    </ElementType>
  );
};

export default Text;
