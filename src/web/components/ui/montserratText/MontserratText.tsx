import { FC } from 'react';
import { Text, TextProps } from 'react-native';

export const montserratFontMapping = {
  '300': 'Montserrat-Light',
  '400': 'Montserrat',
  '500': 'Montserrat-SemiBold',
  '600': 'Montserrat-Bold',
  '700': 'Montserrat-ExtraBold',
};

export type MontserratTextProps = {
  children: string;
  className?: string;
  weight?: keyof typeof montserratFontMapping;
} & TextProps;

export const MontserratText: FC<MontserratTextProps> = ({
  className = '',
  weight = '400',
  children,
  ...rest
}) => {
  return (
    <Text
      style={{ fontFamily: montserratFontMapping[weight] }}
      className={`${className}`}
      {...rest}
    >
      {children}
    </Text>
  );
};
