import type { StationSourceType } from "../stations";
import type { StationAdapter } from "./types";
import { AioRadioAdapter } from "./aio-radio";

const adapters: Record<StationSourceType, StationAdapter> = {
  "aio-radio": new AioRadioAdapter()
};

export function getAdapter(sourceType: StationSourceType): StationAdapter {
  return adapters[sourceType];
}
