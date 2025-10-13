import React, { FC, useContext, useEffect } from 'react';
import { PreloadContext } from './context';

export type FontAsset = {
  type: 'font';
  id: string;
  uri?: string;
  resource?: number; // require(...)
  family?: string;
};

export type AssetProps =
  | { type: 'image'; name: string; uriOrBase64: string }
  | { type: 'shader'; name: string; source: string }
  | { type: 'atlas'; name: string; data: any }
  | { type: 'animation'; name: string; clip: any }
  | FontAsset;

export const Asset: FC<AssetProps> = (props) => {
  const ctx = useContext(PreloadContext);
  if (!ctx) throw new Error('Asset must be used within a Preload');
  useEffect(() => {
    ctx.registerAsset(props);
  }, []);
  return null;
};
