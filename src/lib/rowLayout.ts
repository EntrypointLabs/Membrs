import { createContext, useContext } from 'react';

const DesktopTiles = createContext(false);

export const DesktopTilesProvider = DesktopTiles.Provider;

export function useDesktopTiles(): boolean {
  return useContext(DesktopTiles);
}
