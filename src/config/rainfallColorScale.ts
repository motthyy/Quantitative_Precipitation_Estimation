import colorScale from '../../config/rainfall-colors.json';

export interface RainfallColorStop {
  value: number;
  color: string;
  label: string;
}

export const rainfallColorScale = colorScale as {
  version: number;
  unit: string;
  title: string;
  stops: RainfallColorStop[];
};

