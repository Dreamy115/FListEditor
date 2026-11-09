import { state } from './state';

export const active = () =>
  state.templateSession ||
  state.data.drafts.find((d) => d.id === state.data.active) ||
  state.data.drafts[0];
